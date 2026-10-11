import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
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

function hasActivePremium(source: Record<string, unknown> | null): boolean {
  if (!source) return false
  const hasPremiumFlag = source.is_premium === true
  const hasPremiumPlan = source.plan_type === "Premium" && (source.status === "active" || !source.status)
  const expiry = (source.premium_expires_at || source.current_period_end) as string | undefined
  if (!hasPremiumFlag && !hasPremiumPlan) return false
  if (!expiry) return true
  const expiryTime = new Date(expiry).getTime()
  if (Number.isNaN(expiryTime)) return true
  return expiryTime > Date.now()
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
    const body = await req.json()

    // 1. Dual-Payload Normalization: accept database webhook record (body.record) as well as direct API calls
    const isWebhook = Boolean(body?.record || body?.type === 'INSERT')
    const record = (body?.record || null) as Record<string, unknown> | null
    const notificationId = (record?.id || body?.notificationId || body?.data?.notification_id) as string | undefined

    const targetUserId = (body?.userId || record?.user_id || record?.recipient_id) as string | undefined
    const actorId = (body?.actorId || record?.actor_id || record?.sender_id) as string | undefined
    const notifType = ((body?.type && !['INSERT', 'UPDATE', 'DELETE'].includes(body.type))
      ? body.type
      : (record?.type || body?.data?.type || 'general')) as string
    const category = ((record?.category || body?.category || body?.data?.category || 'general') as string).toLowerCase()
    const rawTitle = (body?.title || record?.title || 'New Notification') as string
    const rawContent = (body?.content || record?.content || '') as string
    const metadata = ((record?.metadata || body?.data || {}) as Record<string, unknown>)

    const appId = normalizeSecret(Deno.env.get("ONESIGNAL_APP_ID"))
    const restApiKey = normalizeSecret(Deno.env.get("ONESIGNAL_REST_API_KEY"))
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

    const supabaseAdmin = (supabaseUrl && serviceKey)
      ? createClient(supabaseUrl, serviceKey)
      : null

    // 2. Server-Side Preference Verification using SUPABASE_SERVICE_ROLE_KEY
    let userProfile: Record<string, unknown> | null = null
    if (targetUserId && supabaseAdmin) {
      try {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("push_notifications, message_notifications, match_notifications, request_notifications, view_notifications, confession_notifications, social_notifications, is_premium, premium_expires_at, plan_type, onesignal_id, message_previews_enabled, status")
          .eq("id", targetUserId)
          .maybeSingle()
        userProfile = profile
      } catch (profErr) {
        console.warn("[PushFunction] Error fetching profile preferences:", profErr)
      }
    }

    // Global push setting
    if (userProfile && userProfile.push_notifications === false) {
      console.log(`[PushFunction] Target user ${targetUserId} has push_notifications disabled globally`)
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "user_disabled_push" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      )
    }

    // Category-specific push settings (critical priority or system category bypasses category flags)
    const isCriticalOrSystem = metadata?.priority === 'critical' || record?.priority === 'critical' || category === 'system'
    if (!isCriticalOrSystem && userProfile) {
      if (category === 'messages' && userProfile.message_notifications === false) {
        return new Response(
          JSON.stringify({ success: true, skipped: true, reason: "messages_disabled" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        )
      }
      if (category === 'matches' && userProfile.match_notifications === false) {
        return new Response(
          JSON.stringify({ success: true, skipped: true, reason: "matches_disabled" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        )
      }
      if (category === 'requests' && userProfile.request_notifications === false) {
        return new Response(
          JSON.stringify({ success: true, skipped: true, reason: "requests_disabled" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        )
      }
      if ((category === 'profile_activity' || category === 'views' || category === 'viewers') && userProfile.view_notifications === false) {
        return new Response(
          JSON.stringify({ success: true, skipped: true, reason: "views_disabled" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        )
      }
      if (category === 'social') {
        if (notifType === 'confession' && userProfile.confession_notifications === false) {
          return new Response(
            JSON.stringify({ success: true, skipped: true, reason: "confessions_disabled" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
          )
        }
        if (userProfile.social_notifications === false) {
          return new Response(
            JSON.stringify({ success: true, skipped: true, reason: "social_disabled" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
          )
        }
      }
      if (notifType === 'confession' && userProfile.confession_notifications === false) {
        return new Response(
          JSON.stringify({ success: true, skipped: true, reason: "confessions_disabled" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        )
      }
    }

    // 3. Privacy, Anonymity & Freemium Copy Adaptation
    const isAnonymousInteraction = Boolean(
      metadata?.is_anonymous ||
      notifType === 'confession' ||
      (notifType === 'snapshot_reaction' && !actorId) ||
      !actorId
    )
    const safeActorAvatar = isAnonymousInteraction ? null : ((metadata?.actor_avatar_url || metadata?.avatar_url || null) as string | null)
    const safeImageUrl = isAnonymousInteraction ? null : ((metadata?.image_url || safeActorAvatar || null) as string | null)

    let effectiveTitle = rawTitle
    let effectiveContent = rawContent

    if (userProfile) {
      if (category === 'messages') {
        if (userProfile.message_previews_enabled === false) {
          effectiveTitle = 'New message'
          effectiveContent = 'Open The College Date to view this message.'
        } else if (!hasActivePremium(userProfile)) {
          effectiveTitle = 'New message 💬'
          effectiveContent = 'Someone sent you a message on The College Date. Tap to chat!'
        }
      } else if (category === 'requests' && !hasActivePremium(userProfile)) {
        effectiveTitle = 'New Connection Request 💌'
        effectiveContent = 'Someone wants to connect with you on The College Date. Tap to review!'
      }
    }

    // 4. Resolve OneSignal Targets (Direct subscriptions, user_notification_devices & profiles.onesignal_id)
    const subscriptionTargets = Array.from(new Set([
      ...(Array.isArray(body?.subscriptionIds) ? body.subscriptionIds : []),
      ...(Array.isArray(body?.onesignalIds) ? body.onesignalIds : []),
      body?.onesignalId,
    ].filter(Boolean)))

    const externalTargets = Array.from(new Set([
      ...(Array.isArray(body?.externalUserIds) ? body.externalUserIds : []),
      ...(Array.isArray(body?.userIds) ? body.userIds : []),
      body?.externalUserId,
      body?.userId,
      targetUserId,
    ].filter(Boolean)))

    if (subscriptionTargets.length === 0 && externalTargets.length > 0 && supabaseAdmin) {
      try {
        const { data: devices, error: deviceError } = await supabaseAdmin
          .from("user_notification_devices")
          .select("onesignal_subscription_id, permission_status")
          .in("user_id", externalTargets)
          .is("revoked_at", null)
          .not("onesignal_subscription_id", "is", null)

        if (!deviceError && devices && devices.length > 0) {
          for (const d of devices) {
            if (d.permission_status !== "denied" && d.onesignal_subscription_id) {
              subscriptionTargets.push(d.onesignal_subscription_id)
            }
          }
          console.log(
            `[PushFunction] Resolved ${subscriptionTargets.length} active subscription ID(s) from user_notification_devices for user(s):`,
            externalTargets
          )
        }

        // Fallback to profiles.onesignal_id if devices table had no rows
        if (subscriptionTargets.length === 0) {
          if (userProfile?.onesignal_id) {
            subscriptionTargets.push(userProfile.onesignal_id as string)
          } else {
            const { data: profiles, error: profileError } = await supabaseAdmin
              .from("profiles")
              .select("onesignal_id")
              .in("id", externalTargets)
              .not("onesignal_id", "is", null)

            if (!profileError && profiles && profiles.length > 0) {
              for (const p of profiles) {
                if (p.onesignal_id) {
                  subscriptionTargets.push(p.onesignal_id)
                }
              }
            }
          }
          if (subscriptionTargets.length > 0) {
            console.log(
              `[PushFunction] Resolved ${subscriptionTargets.length} profile onesignal_id(s) for user(s):`,
              externalTargets
            )
          }
        }
      } catch (dbErr) {
        console.warn("[PushFunction] Error querying device subscriptions from database:", dbErr)
      }
    }

    console.log(
      `[PushFunction] Triggered (webhook=${isWebhook}) for ${subscriptionTargets.length} subscription target(s), ${externalTargets.length} external target(s)`,
    )

    if (subscriptionTargets.length === 0 && externalTargets.length === 0) {
      if (notificationId && supabaseAdmin) {
        try {
          await supabaseAdmin
            .from("notifications")
            .update({
              failed_at: new Date().toISOString(),
              failure_reason: "no_push_targets"
            })
            .eq("id", notificationId)
        } catch (dbUpdErr) {
          console.warn("[PushFunction] Error updating notification failed_at:", dbUpdErr)
        }
      }
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
      if (notificationId && supabaseAdmin) {
        try {
          await supabaseAdmin
            .from("notifications")
            .update({
              failed_at: new Date().toISOString(),
              failure_reason: `Missing config: ${missingConfig.join(", ")}`
            })
            .eq("id", notificationId)
        } catch (dbUpdErr) {
          console.warn("[PushFunction] Error updating notification failed_at:", dbUpdErr)
        }
      }
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

    const effectiveDeepLink = (record?.deep_link || metadata?.url || metadata?.web_url) as string | undefined
    const launchUrl = normalizeLaunchUrl((metadata?.web_url as string | undefined) || effectiveDeepLink)
    const visualIcon = safeImageUrl || DEFAULT_ICON_URL
    const groupKey = (record?.group_key || metadata?.group_key || category || notifType || "general") as string

    let effectiveAndroidChannelId = (metadata?.android_channel_id as string) || "channel_activity"
    if (category === "messages") {
      effectiveAndroidChannelId = "channel_messages"
    } else if (category === "matches" || category === "requests") {
      effectiveAndroidChannelId = "channel_matches"
    }

    let effectiveCollapseId = (metadata?.collapse_id || metadata?.dedupe_key || record?.dedupe_key) as string | undefined
    const effectiveConversationId = (record?.conversation_id || metadata?.conversation_id || metadata?.match_id) as string | undefined
    if (notifType === "message" && effectiveConversationId && targetUserId) {
      effectiveCollapseId = `${targetUserId}:chat:${effectiveConversationId}`
    } else if (notifType === "like" && targetUserId) {
      effectiveCollapseId = `${targetUserId}:likes`
    }

    const notificationPayload: Record<string, unknown> = {
      app_id: appId,
      contents: { en: effectiveContent },
      headings: { en: effectiveTitle },
      data: {
        ...metadata,
        notification_id: notificationId,
        type: notifType,
        category: category,
        url: effectiveDeepLink,
        actor_avatar_url: safeActorAvatar,
        image_url: safeImageUrl,
      },
      android_group: groupKey,
      android_channel_id: effectiveAndroidChannelId,
      priority: (metadata?.priority === "critical" || record?.priority === "critical") ? 10 : undefined,
      ttl: (metadata?.ttl as number) || 259200,
      collapse_id: effectiveCollapseId,
      chrome_web_icon: visualIcon,
      chrome_web_badge: DEFAULT_ICON_URL,
      firefox_icon: visualIcon,
      large_icon: visualIcon,
      android_accent_color: "FF6C63FF",
    }

    if (launchUrl) {
      notificationPayload.url = launchUrl
    }

    if (subscriptionTargets.length > 0) {
      notificationPayload.include_subscription_ids = subscriptionTargets
    } else {
      notificationPayload.include_aliases = { external_id: externalTargets }
      notificationPayload.target_channel = "push"
    }

    // 5. Post to OneSignal and write lifecycle tracking back to public.notifications
    const delivery = await postToOneSignal(notificationPayload, restApiKey)

    if (!delivery.response) {
      console.error("[PushFunction] OneSignal delivery failed:", JSON.stringify(delivery.failures))
      if (notificationId && supabaseAdmin) {
        try {
          await supabaseAdmin
            .from("notifications")
            .update({
              failed_at: new Date().toISOString(),
              failure_reason: JSON.stringify(delivery.failures || "OneSignal delivery failed")
            })
            .eq("id", notificationId)
        } catch (dbUpdErr) {
          console.warn("[PushFunction] Error recording failure timestamp:", dbUpdErr)
        }
      }
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
      if (notificationId && supabaseAdmin) {
        try {
          await supabaseAdmin
            .from("notifications")
            .update({
              failed_at: new Date().toISOString(),
              failure_reason: JSON.stringify(delivery.responseBody.errors)
            })
            .eq("id", notificationId)
        } catch (dbUpdErr) {
          console.warn("[PushFunction] Error recording failure reason:", dbUpdErr)
        }
      }
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

    // Success -> update sent_at on public.notifications
    if (notificationId && supabaseAdmin) {
      try {
        await supabaseAdmin
          .from("notifications")
          .update({
            sent_at: new Date().toISOString()
          })
          .eq("id", notificationId)
      } catch (dbUpdErr) {
        console.warn("[PushFunction] Error recording sent_at timestamp:", dbUpdErr)
      }
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
