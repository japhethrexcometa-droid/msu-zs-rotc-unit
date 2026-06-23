import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.44.2"
import { SmtpClient } from "https://deno.land/x/smtp/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Get environment variables
    const smtpEmail = Deno.env.get('SMTP_EMAIL')
    const smtpPassword = Deno.env.get('SMTP_PASSWORD')
    if (!smtpEmail || !smtpPassword) throw new Error("SMTP credentials are not set.")

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !supabaseServiceKey) throw new Error("Missing Supabase environment variables.")

    // 2. Initialize clients
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error("Missing Authorization header.")
    
    const supabaseUserClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader } }
    })

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // 3. Verify Admin Role
    const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser()
    if (authError || !user) throw new Error("Unauthorized: " + (authError?.message || "User not found"))

    const { data: userData } = await supabaseAdmin.from('users').select('role').eq('id', user.id).single()
    if (!userData || userData.role !== 'admin') {
      throw new Error("Forbidden: Only admins can process enrollments.")
    }

    // 4. Parse request
    const payload = await req.json()
    const { type, requestId, email, firstName, idNumber, rejectionReason, fullRequestData } = payload

    if (!requestId || !type) throw new Error("Missing required parameters (requestId, type)")

    if (type === 'approve') {
      if (!idNumber || !fullRequestData) throw new Error("Missing full request data for approval")

      const dummyEmail = `${idNumber}@rotc.msubuug.edu.ph`
      
      const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: dummyEmail,
        password: idNumber,
        email_confirm: true
      })
      if (createError) throw new Error("Failed to create Auth User: " + createError.message)

      const newUserId = authData.user.id

      const tokenArray = new Uint8Array(32)
      crypto.getRandomValues(tokenArray)
      const qrToken = Array.from(tokenArray).map(b => b.toString(16).padStart(2, '0')).join('')
      const shortToken = 'CD' + Math.floor(Math.random() * 10000).toString().padStart(4, '0')

      const { error: insertError } = await supabaseAdmin.from('users').insert({
        id: newUserId,
        id_number: idNumber,
        full_name: `${fullRequestData.first_name} ${fullRequestData.last_name}`,
        role: 'cadet',
        platoon: fullRequestData.platoon,
        gender: fullRequestData.gender,
        school: fullRequestData.school,
        qr_token: qrToken,
        short_token: shortToken,
        is_active: true
      })
      if (insertError) {
        await supabaseAdmin.auth.admin.deleteUser(newUserId)
        throw new Error("Failed to create public user profile: " + insertError.message)
      }

      await supabaseAdmin.from('enrollment_requests')
        .update({ status: 'approved', reviewed_by: user.id, reviewed_at: new Date().toISOString() })
        .eq('id', requestId)

      await sendGmailEmail(smtpEmail, smtpPassword, email, 'approve', firstName, idNumber)

      return new Response(
        JSON.stringify({ success: true, message: "Enrollment approved and user created." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )

    } else if (type === 'reject') {
      await supabaseAdmin.from('enrollment_requests')
        .update({ 
          status: 'rejected', 
          rejection_reason: rejectionReason,
          reviewed_by: user.id, 
          reviewed_at: new Date().toISOString() 
        })
        .eq('id', requestId)

      await sendGmailEmail(smtpEmail, smtpPassword, email, 'reject', firstName, null, rejectionReason)

      return new Response(
        JSON.stringify({ success: true, message: "Enrollment rejected." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    throw new Error("Invalid action type.")

  } catch (error) {
    console.error("Edge Function Error:", error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})

async function sendGmailEmail(smtpEmail: string, smtpPassword: string, email: string, type: string, firstName: string, idNumber?: string, rejectionReason?: string) {
  let subject = ''
  let htmlContent = ''

  if (type === 'approve') {
    subject = '✅ ROTC Enrollment Approved — MSU-ZS ROTC Unit'
    htmlContent = `
      <div style="font-family: sans-serif; color: #333; line-height: 1.5; padding: 20px;">
        <h2>Congratulations, ${firstName}!</h2>
        <p>Your ROTC enrollment request has been <strong>approved</strong>.</p>
        <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin-top: 0;"><strong>Your Login Credentials:</strong></p>
          <ul style="margin-bottom: 0;">
            <li><strong>ID Number:</strong> ${idNumber}</li>
            <li><strong>Temporary Password:</strong> ${idNumber}</li>
          </ul>
        </div>
        <p>Please log in to the ROTC portal and <strong>change your password immediately</strong> after your first login.</p>
        <p>Welcome to the MSU-ZS ROTC Unit!</p>
      </div>
    `
  } else {
    subject = '❌ ROTC Enrollment Update — MSU-ZS ROTC Unit'
    htmlContent = `
      <div style="font-family: sans-serif; color: #333; line-height: 1.5; padding: 20px;">
        <h2>Dear ${firstName},</h2>
        <p>We regret to inform you that your ROTC enrollment request has been <strong>rejected</strong>.</p>
        <div style="background-color: #fff0f0; border-left: 4px solid #ff4444; padding: 15px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Reason:</strong> ${rejectionReason || 'No specific reason provided.'}</p>
        </div>
        <p>Please <strong>go to the ROTC office</strong> for more information and assistance.</p>
        <p>— MSU-ZS ROTC Unit</p>
      </div>
    `
  }

  const client = new SmtpClient()

  await client.connectTLS({
    hostname: "smtp.gmail.com",
    port: 465,
    username: smtpEmail,
    password: smtpPassword,
  })

  await client.send({
    from: \`MSU-ZS ROTC Unit <\${smtpEmail}>\`,
    to: email,
    subject: subject,
    content: "Please view this email in an HTML compatible client.",
    html: htmlContent,
  })

  await client.close()
}
