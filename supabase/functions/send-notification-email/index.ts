import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

serve(async (req) => {
  // 1. Handle Preflight/OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, subject, body } = await req.json()

    console.log(`[EmailFunction] Triggered for user ${userId}: ${subject}`)

    // TODO: Add your Resend/SendGrid/Nodemailer logic here.
    // Example using a generic fetch or libraries.
    
    // For now, we return a success response to stop the CORS errors in the browser.
    return new Response(
      JSON.stringify({ success: true, message: "Email notification processed" }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400 
      }
    )
  }
})
