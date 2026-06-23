import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.44.2"

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

      // Send email (non-blocking — approval succeeds even if email fails)
      const emailResult = await sendEmail(email, 'approve', firstName, idNumber).catch(e => {
        console.error("Email send failed (non-blocking):", e)
        return { sent: false, error: e.message }
      })

      return new Response(
        JSON.stringify({ success: true, message: "Enrollment approved and user created.", emailSent: !!emailResult?.sent }),
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

      // Send email (non-blocking)
      const emailResult = await sendEmail(email, 'reject', firstName, null, rejectionReason).catch(e => {
        console.error("Email send failed (non-blocking):", e)
        return { sent: false, error: e.message }
      })

      return new Response(
        JSON.stringify({ success: true, message: "Enrollment rejected.", emailSent: !!emailResult?.sent }),
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

// ── Gmail SMTP via raw TCP (base64-encoded SMTP conversation) ──
// Supabase Edge Functions block outbound TCP, so we use Gmail's
// SMTP relay via Deno.connect with STARTTLS on port 587.
async function sendEmail(
  toEmail: string, 
  type: string, 
  firstName: string, 
  idNumber?: string | null, 
  rejectionReason?: string
): Promise<{ sent: boolean }> {
  const smtpEmail = Deno.env.get('SMTP_EMAIL')
  const smtpPassword = Deno.env.get('SMTP_PASSWORD')
  
  if (!smtpEmail || !smtpPassword) {
    console.warn("SMTP credentials not configured — skipping email")
    return { sent: false }
  }

  let subject = ''
  let htmlContent = ''

  if (type === 'approve') {
    subject = 'ROTC Enrollment Approved - MSU-ZS ROTC Unit'
    htmlContent = `<div style="font-family:sans-serif;color:#333;line-height:1.5;padding:20px;"><h2>Congratulations, ${firstName}!</h2><p>Your ROTC enrollment request has been <strong>approved</strong>.</p><div style="background-color:#f4f4f4;padding:15px;border-radius:5px;margin:20px 0;"><p style="margin-top:0;"><strong>Your Login Credentials:</strong></p><ul style="margin-bottom:0;"><li><strong>ID Number:</strong> ${idNumber}</li><li><strong>Temporary Password:</strong> ${idNumber}</li></ul></div><p>Please log in to the ROTC portal and <strong>change your password immediately</strong> after your first login.</p><p>Welcome to the MSU-ZS ROTC Unit!</p></div>`
  } else {
    subject = 'ROTC Enrollment Update - MSU-ZS ROTC Unit'
    htmlContent = `<div style="font-family:sans-serif;color:#333;line-height:1.5;padding:20px;"><h2>Dear ${firstName},</h2><p>We regret to inform you that your ROTC enrollment request has been <strong>rejected</strong>.</p><div style="background-color:#fff0f0;border-left:4px solid #ff4444;padding:15px;margin:20px 0;"><p style="margin:0;"><strong>Reason:</strong> ${rejectionReason || 'No specific reason provided.'}</p></div><p>Please <strong>go to the ROTC office</strong> for more information and assistance.</p><p>— MSU-ZS ROTC Unit</p></div>`
  }

  // Use raw SMTP over TLS (Deno.connectTls to port 465)
  const conn = await Deno.connectTls({ hostname: "smtp.gmail.com", port: 465 })
  
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  async function readResponse(): Promise<string> {
    const buf = new Uint8Array(4096)
    const n = await conn.read(buf)
    if (n === null) throw new Error("SMTP connection closed")
    return decoder.decode(buf.subarray(0, n))
  }

  async function sendCommand(cmd: string): Promise<string> {
    await conn.write(encoder.encode(cmd + "\r\n"))
    return await readResponse()
  }

  // SMTP conversation
  const greeting = await readResponse()
  if (!greeting.startsWith('220')) throw new Error("SMTP greeting failed: " + greeting)

  let resp = await sendCommand(`EHLO rotc-system`)
  if (!resp.startsWith('250')) throw new Error("EHLO failed: " + resp)

  // AUTH LOGIN
  resp = await sendCommand('AUTH LOGIN')
  if (!resp.startsWith('334')) throw new Error("AUTH failed: " + resp)

  resp = await sendCommand(btoa(smtpEmail))
  if (!resp.startsWith('334')) throw new Error("Username failed: " + resp)

  resp = await sendCommand(btoa(smtpPassword))
  if (!resp.startsWith('235')) throw new Error("Password failed: " + resp)

  // MAIL FROM / RCPT TO
  resp = await sendCommand(`MAIL FROM:<${smtpEmail}>`)
  if (!resp.startsWith('250')) throw new Error("MAIL FROM failed: " + resp)

  resp = await sendCommand(`RCPT TO:<${toEmail}>`)
  if (!resp.startsWith('250')) throw new Error("RCPT TO failed: " + resp)

  // DATA
  resp = await sendCommand('DATA')
  if (!resp.startsWith('354')) throw new Error("DATA failed: " + resp)

  const boundary = "----=_Part_" + crypto.randomUUID().replace(/-/g, '')
  const message = [
    `From: MSU-ZS ROTC Unit <${smtpEmail}>`,
    `To: ${toEmail}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset=UTF-8`,
    ``,
    `${subject}`,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    ``,
    htmlContent,
    ``,
    `--${boundary}--`,
    `.`
  ].join('\r\n')

  resp = await sendCommand(message)
  if (!resp.startsWith('250')) throw new Error("Message send failed: " + resp)

  await sendCommand('QUIT')
  conn.close()

  console.log(`Email sent successfully to ${toEmail}`)
  return { sent: true }
}
