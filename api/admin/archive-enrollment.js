import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Setup CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { requestIds, academicYear, archiveAllProcessed } = req.body;

    if (!archiveAllProcessed && (!Array.isArray(requestIds) || requestIds.length === 0)) {
      throw new Error("No request IDs provided.");
    }

    if (!academicYear) {
      throw new Error("Academic Year is required for archiving (e.g. '2023-2024').");
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const authHeader = req.headers.authorization;

    const supabaseUserClient = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '', {
      global: { headers: { Authorization: authHeader } }
    });
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify Admin Access
    const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { data: userData } = await supabaseAdmin.from('users').select('role').eq('id', user.id).single();
    if (!userData || (userData.role !== 'admin' && userData.role !== 'officer')) {
      throw new Error("Forbidden");
    }

    // 1. Fetch the records to be archived
    let query = supabaseAdmin
      .from('enrollment_requests')
      .select('*');

    if (archiveAllProcessed) {
      query = query.neq('status', 'pending');
    } else {
      query = query.in('id', requestIds);
    }

    const { data: records, error: fetchError } = await query;
    if (fetchError) throw fetchError;
    if (!records || records.length === 0) {
      return res.status(200).json({ success: true, processed: 0, message: "No records found to archive." });
    }

    // 2. Map to Archive Schema
    const archivedRecords = records.map(r => ({
      id_number: r.id_number,
      school: r.school,
      last_name: r.last_name,
      first_name: r.first_name,
      middle_initial: r.middle_initial,
      suffix: r.suffix,
      gender: r.gender,
      date_of_birth: r.date_of_birth,
      course_year: r.course_year,
      year_level: r.year_level,
      year_class: r.year_class,
      contact_number: r.contact_number,
      home_address: r.home_address,
      religion: r.religion,
      blood_type: r.blood_type,
      height_feet: r.height_feet,
      email: r.email,
      beneficiary_name: r.beneficiary_name,
      beneficiary_relationship: r.beneficiary_relationship,
      emergency_name: r.emergency_name,
      emergency_relationship: r.emergency_relationship,
      emergency_contact: r.emergency_contact,
      ms_subject: r.ms_subject,
      ms_title: r.ms_title,
      semester: r.semester,
      academic_year: academicYear,
      role: r.role,
      platoon: r.platoon,
      status: r.status,
      rejection_reason: r.rejection_reason,
      reviewed_by: r.reviewed_by,
      reviewed_at: r.reviewed_at,
      original_created_at: r.created_at,
      archived_by: user.id
    }));

    // 3. Batch Insert into Archives
    const { error: archiveError } = await supabaseAdmin
      .from('enrollment_archives')
      .insert(archivedRecords);

    if (archiveError) throw archiveError;

    // 4. Delete from Live Table
    const processedIds = records.map(r => r.id);
    const { error: deleteError } = await supabaseAdmin
      .from('enrollment_requests')
      .delete()
      .in('id', processedIds);

    if (deleteError) {
      // Note: This is an atomicity issue, but in many RLS environments, we have to do this in two steps.
      // Ideally this would be a Postgres Function to ensure atomicity.
      console.error("Archive succeeded but deletion failed:", deleteError);
      return res.status(500).json({
        success: false,
        error: "Records were archived but could not be removed from the active list. Please contact support."
      });
    }

    return res.status(200).json({
      success: true,
      processed: archivedRecords.length,
      message: `Successfully archived ${archivedRecords.length} records to academic year ${academicYear}.`
    });

  } catch (error) {
    console.error("Archive Error:", error);
    return res.status(400).json({ success: false, error: error.message });
  }
}
