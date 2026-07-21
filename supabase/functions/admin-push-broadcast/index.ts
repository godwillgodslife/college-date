import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

const SITE_URL = "https://www.thecollegedate.com"
const DEFAULT_ICON_URL = `${SITE_URL}/logo.png`
const CHUNK_SIZE = 1800

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

function normalizeSecret(value: string | undefined) {
  if (!value) return ""
  return value.trim().replace(/^['"]|['"]$/g, "")
}

function normalizeSegment(value: unknown) {
  const segment = String(value || "all").trim().toLowerCase()
  if (["total subscriptions", "all users", "all_users"].includes(segment)) return "all"
  if (["active users", "active", "active_users"].includes(segment)) return "active_7d"
  if (["inactive users", "inactive", "inactive_users"].includes(segment)) return "inactive_7d"
  if (["all", "active_7d", "inactive_7d"].includes(segment)) return segment
  return "all"
}

function normalizeLaunchUrl(url?: string) {
  if (!url || typeof url !== "string") return undefined
  if (url.startsWith("http://") || url.startsWith("https://")) return url
  if (url.startsWith("/")) return `${SITE_URL}${url}`
  return undefined
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size))
  return chunks
}

async function postToOneSignal(payload: Record<string, unknown>, restApiKey: string) {
  const attempts = [
    { endpoint: "https://api.onesignal.com/notifications", authorization: `Key ${restApiKey}` },
    { endpoint: "https://onesignal.com/api/v1/notifications", authorization: `Basic ${restApiKey}` },
  ]

  const failures = []
  for (const attempt of attempts) {
    const response = await fetch(attempt.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: attempt.authorization,
      },
      body: JSON.stringify(payload),
    })
    const responseBody = await response.json().catch(() => ({}))
    if (response.ok) return { response, responseBody, endpoint: attempt.endpoint }
    failures.push({ endpoint: attempt.endpoint, status: response.status, response: responseBody })
  }

  return { failures }
}

async function insertInAppNotifications(
  adminClient: ReturnType<typeof createClient>,
  userIds: string[],
  broadcastId: string,
  title: string,
  body: string,
  segment: string,
  url: string,
) {
  const batches = chunk(userIds, 500)
  let inserted = 0

  for (const batch of batches) {
    const rows = batch.map((userId) => ({
      user_id: userId,
      recipient_id: userId,
      type: "admin_broadcast",
      category: "marketing",
      title,
      content: body,
      deep_link: url,
      priority: "normal",
      group_key: "admin_broadcast",
      dedupe_key: `admin_broadcast:${broadcastId}:${userId}`,
      metadata: {
        broadcast_id: broadcastId,
        segment,
        url,
        source: "admin_push_broadcast",
      },
    }))

    const { error } = await adminClient
      .from("notifications")
      .upsert(rows, { onConflict: "user_id,dedupe_key", ignoreDuplicates: true })

    if (error) throw error
    inserted += rows.length
  }

  return inserted
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return json({ success: false, message: "Method not allowed" }, 405)

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    const authHeader = req.headers.get("Authorization") || ""
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: authData, error: authError } = await userClient.auth.getUser()
    if (authError || !authData.user) return json({ success: false, message: "Not authenticated" }, 401)

    const { data: canBroadcast, error: permissionError } = await userClient.rpc("admin_has_permission", {
      p_permission: "push:broadcast",
    })
    if (permissionError || canBroadcast !== true) return json({ success: false, message: "Not authorized" }, 403)

    const payload = await req.json().catch(() => ({}))
    const action = String(payload.action || "preview").trim().toLowerCase()
    const segment = normalizeSegment(payload.segment)
    const title = String(payload.title || "").trim()
    const body = String(payload.body || "").trim()
    const reason = String(payload.reason || "").trim()
    const url = String(payload.url || "/notifications").trim()
    const launchUrl = normalizeLaunchUrl(url) || `${SITE_URL}/notifications`

    if (!["preview", "test", "broadcast"].includes(action)) {
      return json({ success: false, message: "Unsupported broadcast action" }, 400)
    }

    if ((action === "test" || action === "broadcast") && (title.length < 3 || body.length < 3)) {
      return json({ success: false, message: "Title and message are required" }, 400)
    }

    if (action === "broadcast" && reason.length < 5) {
      return json({ success: false, message: "Audit reason is required" }, 400)
    }

    const { data: targets, error: targetError } = await userClient.rpc("admin_get_push_broadcast_targets", {
      p_segment: segment,
      p_test_user_id: action === "test" ? authData.user.id : null,
    })

    if (targetError) throw targetError

    const subscriptionIds = Array.isArray(targets?.subscriptionIds) ? targets.subscriptionIds : []
    const userIds = Array.isArray(targets?.userIds) ? targets.userIds : []
    const userCount = Number(targets?.userCount || 0)
    const deviceCount = Number(targets?.deviceCount || 0)

    if (action === "preview") {
      return json({
        success: true,
        action,
        segment,
        userCount,
        deviceCount,
        generatedAt: targets?.generatedAt,
      })
    }

    const broadcastInsert = await adminClient
      .from("admin_push_broadcasts")
      .insert({
        admin_user_id: authData.user.id,
        segment,
        title,
        body,
        target_user_count: userCount,
        target_device_count: deviceCount,
        status: deviceCount > 0 ? "sending" : "skipped",
        test_mode: action === "test",
        metadata: { action, reason, url: launchUrl },
      })
      .select("id")
      .single()

    if (broadcastInsert.error) throw broadcastInsert.error
    const broadcastId = broadcastInsert.data.id

    if (deviceCount === 0) {
      await adminClient.from("admin_push_broadcasts").update({
        status: "skipped",
        completed_at: new Date().toISOString(),
      }).eq("id", broadcastId)

      await adminClient.from("admin_audit_logs").insert({
        admin_user_id: authData.user.id,
        action: action === "test" ? "admin_test_push_broadcast" : "admin_push_broadcast",
        target_type: "push_broadcast",
        target_id: broadcastId,
        metadata: { segment, reason, userCount, deviceCount, skipped: true },
      })

      return json({ success: true, skipped: true, message: "No eligible push targets", broadcastId, userCount, deviceCount })
    }

    const appId = normalizeSecret(Deno.env.get("ONESIGNAL_APP_ID"))
    const restApiKey = normalizeSecret(Deno.env.get("ONESIGNAL_REST_API_KEY"))
    if (!appId || !restApiKey) {
      await adminClient.from("admin_push_broadcasts").update({
        status: "failed",
        error_message: "OneSignal is not configured",
        completed_at: new Date().toISOString(),
      }).eq("id", broadcastId)
      return json({ success: false, message: "OneSignal is not configured", broadcastId, missingConfig: ["ONESIGNAL_APP_ID", "ONESIGNAL_REST_API_KEY"] }, 200)
    }

    const responses = []
    for (const subscriptionChunk of chunk(subscriptionIds, CHUNK_SIZE)) {
      const notificationPayload = {
        app_id: appId,
        include_subscription_ids: subscriptionChunk,
        contents: { en: body },
        headings: { en: title },
        data: {
          type: "admin_broadcast",
          category: "marketing",
          priority: "normal",
          group_key: "admin_broadcast",
          broadcast_id: broadcastId,
          segment,
          url,
          web_url: launchUrl,
        },
        url: launchUrl,
        web_url: launchUrl,
        app_url: url,
        android_group: "admin_broadcast",
        ttl: 259200,
        collapse_id: action === "test" ? `admin_test_push:${broadcastId}` : undefined,
        chrome_web_icon: DEFAULT_ICON_URL,
        chrome_web_badge: DEFAULT_ICON_URL,
        firefox_icon: DEFAULT_ICON_URL,
        large_icon: DEFAULT_ICON_URL,
        android_accent_color: "FF6C63FF",
      }
      const delivery = await postToOneSignal(notificationPayload, restApiKey)
      responses.push(delivery)
      if (!delivery.response) throw new Error(JSON.stringify(delivery.failures))
    }

    let inAppInserted = 0
    if (action === "broadcast") {
      inAppInserted = await insertInAppNotifications(adminClient, userIds, broadcastId, title, body, segment, url)
    }

    await adminClient.from("admin_push_broadcasts").update({
      status: "sent",
      onesignal_response: responses,
      metadata: { action, reason, url: launchUrl, inAppInserted },
      completed_at: new Date().toISOString(),
    }).eq("id", broadcastId)

    await adminClient.from("admin_audit_logs").insert({
      admin_user_id: authData.user.id,
      action: action === "test" ? "admin_test_push_broadcast" : "admin_push_broadcast",
      target_type: "push_broadcast",
      target_id: broadcastId,
      metadata: { segment, reason, userCount, deviceCount, inAppInserted },
    })

    return json({
      success: true,
      action,
      broadcastId,
      segment,
      userCount,
      deviceCount,
      inAppInserted,
    })
  } catch (error) {
    console.error("[admin-push-broadcast] error:", error)
    return json({ success: false, message: error.message || "Broadcast failed" }, 500)
  }
})
