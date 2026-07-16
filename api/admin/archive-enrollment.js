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
    const { requestIds, academicYear, archiveAllProcessed, status } = req.body;

    if (!archiveAllProcessed && (!Array.isArray(requestIds) || requestIds.length === 0)) {
      throw new Error("No request IDs provided.");
    }

    if (!academicYear) {
      throw new Error("Folder Name is required for archiving (e.g. 'AER & ASR 2024-2025').");
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

    // 1. Fetch records to archive (in batches of 1000 to bypass Supabase limit)
    let records = [];
    const BATCH_SIZE = 1000;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      let query = supabaseAdmin
        .from('enrollment_requests')
        .select('*');

      if (archiveAllProcessed) {
        if (status) {
          query = query.eq('status', status);
        } else {
          query = query.neq('status', 'pending');
        }
      } else {
        query = query.in('id', requestIds);
      }

      query = query.range(offset, offset + BATCH_SIZE - 1);

      const { data: batch, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      if (batch && batch.length > 0) {
        records = records.concat(batch);
        offset += BATCH_SIZE;
        if (batch.length < BATCH_SIZE) hasMore = false;
      } else {
        hasMore = false;
      }
    }

    if (records.length === 0) {
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

    // 3. Batch Insert into Archives (in chunks of 500)
    const INSERT_CHUNK = 500;
    for (let i = 0; i < archivedRecords.length; i += INSERT_CHUNK) {
      const chunk = archivedRecords.slice(i, i + INSERT_CHUNK);
      const { error: archiveError } = await supabaseAdmin
        .from('enrollment_archives')
        .insert(chunk);
      if (archiveError) throw archiveError;
    }

    // 4. Delete from Live Table (in chunks of 500)
    const processedIds = records.map(r => r.id);
    for (let i = 0; i < processedIds.length; i += INSERT_CHUNK) {
      const chunk = processedIds.slice(i, i + INSERT_CHUNK);
      const { error: deleteError } = await supabaseAdmin
        .from('enrollment_requests')
        .delete()
        .in('id', chunk);

      if (deleteError) {
        console.error("Archive succeeded but deletion failed at chunk:", deleteError);
        return res.status(500).json({
          success: false,
          error: "Records were archived but could not be removed from the active list. Please contact support."
        });
      }
    }

    // 5. Generate and Store CSV Snapshot in Document Vault
    try {
      const csvHeaders = [
        'ID Number', 'School', 'Last Name', 'First Name', 'MI', 'Suffix',
        'Gender', 'DOB', 'Course & Year', 'Contact No.', 'Home Address', 'Religion',
        'Blood Type', 'Height', 'Beneficiary', 'Relationship', 'Email Add',
        'Emergency Contact Name', 'Relationship', 'Contact Number', 'Status', 'Semester', 'MS Class', 'Role', 'Archived Date'
      ]

      let grandTotalMale = 0;
      let grandTotalFemale = 0;
      const schoolStats = {};

      const csvRows = archivedRecords.map(r => {
        const gender = (r.gender || '').toUpperCase();
        const school = r.school || 'Unknown';
        
        if (!schoolStats[school]) schoolStats[school] = { male: 0, female: 0 };
        
        if (gender === 'MALE' || gender === 'M') {
          schoolStats[school].male++;
          grandTotalMale++;
        } else if (gender === 'FEMALE' || gender === 'F') {
          schoolStats[school].female++;
          grandTotalFemale++;
        }

        const msClass = r.ms_title && r.ms_subject ? `${r.ms_title} (${r.ms_subject})` : (r.ms_title || r.ms_subject || '');

        return [
          r.id_number, r.school, r.last_name, r.first_name, r.middle_initial, r.suffix,
          r.gender, r.date_of_birth, r.course_year, r.contact_number, r.home_address, r.religion,
          r.blood_type, r.height_feet, r.beneficiary_name, r.beneficiary_relationship, r.email,
          r.emergency_name, r.emergency_relationship, r.emergency_contact, r.status, r.semester, 
          msClass, r.role, r.original_created_at
        ].map(v => `"${(v || '').toString().replace(/"/g, '""')}"`).join(',')
      });

      const footerRows = ['', '']; // Empty rows for padding
      
      Object.entries(schoolStats).forEach(([school, stats]) => {
        const total = stats.male + stats.female;
        footerRows.push(`"${school} Total: Male=${stats.male} Female=${stats.female} =${total}"`);
      });

      const grandTotal = grandTotalMale + grandTotalFemale;
      const dateStrDetailed = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
      footerRows.push(`"GRAND TOTAL: ${grandTotal} (Male=${grandTotalMale} Female=${grandTotalFemale}) - Exported ${dateStrDetailed}"`);

      const csvContent = [csvHeaders.join(','), ...csvRows, ...footerRows].join('\n');
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `${dateStr}_Archive_${academicYear.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
      const storagePath = `${academicYear}/${filename}`;

      // Upload CSV to Vault Storage
      await supabaseAdmin.storage.from('vault').upload(storagePath, Buffer.from(csvContent), {
        contentType: 'text/csv',
        upsert: true
      });

      // Save Metadata to Archived Documents
      await supabaseAdmin.from('archived_documents').insert({
        filename,
        original_name: filename,
        folder_name: academicYear,
        file_size: csvContent.length,
        mime_type: 'text/csv',
        storage_path: storagePath,
        uploaded_by: user.id
      });
    } catch (csvErr) {
      console.error("Failed to generate CSV snapshot:", csvErr);
      // We don't fail the whole request because the primary archival is already done
    }

    return res.status(200).json({
      success: true,
      processed: archivedRecords.length,
      message: `Successfully archived ${archivedRecords.length} records to folder ${academicYear} and generated a CSV snapshot in the Document Vault.`
    });

  } catch (error) {
    console.error("Archive Error:", error);
    return res.status(400).json({ success: false, error: error.message });
  }
}
