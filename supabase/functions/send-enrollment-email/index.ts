import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not set.")
    }

    const { type, email, firstName, idNumber, rejectionReason } = await req.json()

    if (!email || !type || !firstName) {
      throw new Error("Missing required parameters (email, type, firstName)")
    }

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
    } else if (type === 'reject') {
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
    } else {
      throw new Error("Invalid notification type. Must be 'approve' or 'reject'.")
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'MSU-ZS ROTC Unit <onboarding@resend.dev>', // Update this when domain is verified
        to: email,
        subject: subject,
        html: htmlContent,
      }),
    })

    const resData = await res.json()
    if (!res.ok) {
      console.error("Resend API Error:", resData)
      throw new Error(resData.message || "Failed to send email.")
    }

    return new Response(
      JSON.stringify({ success: true, data: resData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error("Function Error:", error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
