import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

const SITE_URL = "https://www.thecollegedate.com"
const DEFAULT_ICON_URL = `${SITE_URL}/logo.png`

function normalizeLaunchUrl(url?: string) {
  if (!url || typeof url !== "string") return undefined
  if (url.startsWith("http://") || url.startsWith("https://")) return url
  if (url.startsWith("/")) return `${SITE_URL}${url}`
  return undefined
}

function normalizeSecret(value: string | undefined) {
  if (!value) return ""
  return value.trim().replace(/^['"]|['"]$/g, "")
}

async function postToOneSignal(payload: Record<string, unknown>, restApiKey: string) {
  const attempts = [
    {
      endpoint: "https://api.onesignal.com/notifications",
      authorization: `Key ${restApiKey}`,
    },
    {
      endpoint: "https://onesignal.com/api/v1/notifications",
      authorization: `Basic ${restApiKey}`,
    },
  ]

  const failures = []
  for (const attempt of attempts) {
    const response = await fetch(attempt.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": attempt.authorization,
      },
      body: JSON.stringify(payload),
    })

    const responseBody = await response.json().catch(() => ({}))
    if (response.ok) {
      return { response, responseBody, endpoint: attempt.endpoint }
    }

    failures.push({
      endpoint: attempt.endpoint,
      status: response.status,
      response: responseBody,
    })
  }

  return { failures }
}

serve(async (req) => {
  // 1. Handle Preflight/OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      onesignalId,
      onesignalIds,
      subscriptionIds,
      externalUserId,
      externalUserIds,
      title,
      content,
      data,
    } = await req.json()
    const appId = normalizeSecret(Deno.env.get("ONESIGNAL_APP_ID"))
    const restApiKey = normalizeSecret(Deno.env.get("ONESIGNAL_REST_API_KEY"))
    const subscriptionTargets = Array.from(new Set([
      ...(Array.isArray(subscriptionIds) ? subscriptionIds : []),
      ...(Array.isArray(onesignalIds) ? onesignalIds : []),
      onesignalId,
    ].filter(Boolean)))
    const externalTargets = Array.from(new Set([
      ...(Array.isArray(externalUserIds) ? externalUserIds : []),
      externalUserId,
    ].filter(Boolean)))

    console.log(
      `[PushFunction] Triggered for ${subscriptionTargets.length} subscription target(s), ${externalTargets.length} external target(s)`,
    )

    if (subscriptionTargets.length === 0 && externalTargets.length === 0) {
      return new Response(
        JSON.stringify({ success: true, skipped: true, message: "No push targets" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      )
    }

    const missingConfig = [
      !appId ? "ONESIGNAL_APP_ID" : null,
      !restApiKey ? "ONESIGNAL_REST_API_KEY" : null,
    ].filter(Boolean)

    if (missingConfig.length > 0) {
      console.warn("[PushFunction] Missing OneSignal environment variables:", missingConfig.join(", "))
      return new Response(
        JSON.stringify({
          success: false,
          skipped: true,
          message: "OneSignal is not configured",
          missingConfig,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      )
    }

    const launchUrl = normalizeLaunchUrl(data?.web_url || data?.url)
    const visualIcon = data?.image_url || data?.avatar_url || data?.actor_avatar_url || DEFAULT_ICON_URL
    const groupKey = data?.group_key || data?.category || data?.type || "general"

    const notificationPayload: Record<string, unknown> = {
      app_id: appId,
      contents: { en: content },
      headings: { en: title },
      data: data || {},
      url: launchUrl,
      web_url: launchUrl,
      app_url: data?.url,
      android_group: groupKey,
      android_channel_id: data?.android_channel_id,
      priority: data?.priority === "critical" ? 10 : undefined,
      ttl: data?.ttl || 259200,
      collapse_id: data?.collapse_id || data?.dedupe_key,
      chrome_web_icon: visualIcon,
      chrome_web_badge: DEFAULT_ICON_URL,
      firefox_icon: visualIcon,
      large_icon: visualIcon,
      android_accent_color: "FF6C63FF",
    }

    if (subscriptionTargets.length > 0) {
      notificationPayload.include_subscription_ids = subscriptionTargets
    } else {
      notificationPayload.include_aliases = { external_id: externalTargets }
      notificationPayload.target_channel = "push"
    }

    const delivery = await postToOneSignal(notificationPayload, restApiKey)

    if (!delivery.response) {
      console.error("[PushFunction] OneSignal delivery failed:", JSON.stringify(delivery.failures))
      return new Response(
        JSON.stringify({ success: false, failures: delivery.failures }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 502,
        },
      )
    }

    if (delivery.responseBody?.errors) {
      console.warn("[PushFunction] OneSignal accepted request with target errors:", JSON.stringify(delivery.responseBody))
      return new Response(
        JSON.stringify({
          success: false,
          acceptedByOneSignal: true,
          targets: subscriptionTargets.length || externalTargets.length,
          targetType: subscriptionTargets.length > 0 ? "subscription" : "external_id",
          endpoint: delivery.endpoint,
          response: delivery.responseBody,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        targets: subscriptionTargets.length || externalTargets.length,
        targetType: subscriptionTargets.length > 0 ? "subscription" : "external_id",
        endpoint: delivery.endpoint,
        response: delivery.responseBody,
      }),
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
