import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

function normalizeSecret(val?: string): string {
  if (!val) return ""
  return val.trim().replace(/^['"]|['"]$/g, "")
}

function normalizeNigerianPhone(phone: string): string | null {
  if (!phone || typeof phone !== "string") return null
  // Remove all non-numeric characters
  let clean = phone.replace(/\D/g, "")
  
  // If starts with 0 and is 11 digits (e.g. 08031234567) -> 2348031234567
  if (clean.startsWith("0") && clean.length === 11) {
    clean = "234" + clean.slice(1)
  } else if (clean.startsWith("234") && clean.length === 13) {
    // Already in international format
  } else if ((clean.startsWith("7") || clean.startsWith("8") || clean.startsWith("9")) && clean.length === 10) {
    clean = "234" + clean
  } else if (clean.length >= 10 && clean.length <= 15) {
    // International number
  } else {
    return null
  }
  return clean
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const {
      phoneNumber,
      to,
      userId,
      message,
      sms,
      senderId,
      channel = "generic"
    } = await req.json()

    const rawMessage = message || sms
    if (!rawMessage || typeof rawMessage !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing required field: message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const apiKey = normalizeSecret(Deno.env.get("TERMII_API_KEY"))
    const defaultSender = normalizeSecret(Deno.env.get("TERMII_SENDER_ID")) || "CollegeDate"
    const fallbackSender = normalizeSecret(Deno.env.get("TERMII_FALLBACK_SENDER_ID")) || "Termii"

    if (!apiKey) {
      console.error("[Termii SMS] Missing TERMII_API_KEY secret")
      return new Response(
        JSON.stringify({ error: "Termii SMS not configured on server" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    let targetPhone = phoneNumber || to

    // If userId provided and no direct phone number, look up phone in profiles
    if (!targetPhone && userId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") || ""
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
      if (supabaseUrl && serviceRoleKey) {
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
        const { data: prof } = await supabaseAdmin
          .from("profiles")
          .select("phone_number, phone")
          .eq("id", userId)
          .maybeSingle()
        targetPhone = prof?.phone_number || prof?.phone || null
      }
    }

    const cleanPhone = normalizeNigerianPhone(targetPhone)
    if (!cleanPhone) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number provided", rawPhone: targetPhone }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const primarySender = senderId || defaultSender
    console.log(`[Termii SMS] Sending to ${cleanPhone} via sender '${primarySender}', channel '${channel}'`)

    // Attempt 1: Send via primary sender ID
    let termiiRes = await fetch("https://api.ng.termii.com/api/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: cleanPhone,
        from: primarySender,
        sms: rawMessage,
        type: "plain",
        channel: channel,
        api_key: apiKey
      })
    })

    let termiiData = await termiiRes.json().catch(() => ({}))

    // If primary sender failed (e.g. unapproved sender ID while under carrier review), fallback to Termii default
    if (!termiiRes.ok || termiiData?.code === "400" || termiiData?.message?.toLowerCase?.()?.includes?.("sender")) {
      console.warn(`[Termii SMS] Primary sender '${primarySender}' failed (${JSON.stringify(termiiData)}), falling back to '${fallbackSender}'`)
      termiiRes = await fetch("https://api.ng.termii.com/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: cleanPhone,
          from: fallbackSender,
          sms: rawMessage,
          type: "plain",
          channel: "generic",
          api_key: apiKey
        })
      })
      termiiData = await termiiRes.json().catch(() => ({}))
    }

    console.log("[Termii SMS] Response:", JSON.stringify(termiiData))

    if (!termiiRes.ok || termiiData?.code === "400") {
      return new Response(
        JSON.stringify({ success: false, error: termiiData?.message || "Failed to send SMS", termiiResponse: termiiData }),
        { status: termiiRes.status || 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageId: termiiData?.message_id || null,
        phone: cleanPhone,
        balance: termiiData?.balance || null
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (err: any) {
    console.error("[Termii SMS] Internal Error:", err.message)
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
