import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.44.2"
import { sendEmail } from "../_shared/email.ts"

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

    // 4. Parse request and sanitize
    const payload = await req.json()
    const type = String(payload.type || '').trim()
    const requestId = String(payload.requestId || '').trim()
    const email = String(payload.email || '').trim()
    const firstName = String(payload.firstName || '').trim()
    const idNumber = String(payload.idNumber || '').trim()
    const rejectionReason = payload.rejectionReason ? String(payload.rejectionReason).trim() : undefined
    const fullRequestData = payload.fullRequestData

    if (!requestId || !type) throw new Error("Missing required parameters (requestId, type)")
    if (!email || !firstName) throw new Error("Missing required parameters (email, firstName)")

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

// End of function
