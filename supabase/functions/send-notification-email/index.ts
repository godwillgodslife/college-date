import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import nodemailer from "npm:nodemailer@6.9.10"
import { corsHeaders } from "../_shared/cors.ts"

const SITE_URL = Deno.env.get("SITE_URL") || "https://www.thecollegedate.com"
const LOGO_URL = `${SITE_URL}/logo.png`

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeUrl(url?: string): string {
  if (!url || typeof url !== "string") return SITE_URL
  if (url.startsWith("http://") || url.startsWith("https://")) return url
  if (url.startsWith("/")) return `${SITE_URL}${url}`
  return `${SITE_URL}/${url}`
}

function normalizeSecret(value: string | undefined): string {
  if (!value) return ""
  return value.trim().replace(/^['"]|['"]$/g, "")
}

function getActionLabel(type?: string): string {
  switch (type) {
    case "match":
      return "View Your Match 🔥"
    case "like":
    case "super_swipe":
    case "request":
      return "View Connection Request 💌"
    case "chat":
    case "message":
    case "mini_game":
    case "mini_game_response":
      return "Reply in Chat 💬"
    case "vibe_endorsement":
      return "View Your Profile ✨"
    case "quest_reward":
    case "streak_milestone":
      return "Open Campus Dashboard 🔥"
    case "campus_clash_victory":
      return "View Campus Leaderboard 🏆"
    case "mystery_match_revealed":
      return "Meet Your Mystery Match 🎉"
    case "ask":
      return "Answer Anonymous Question 🎭"
    case "confession":
      return "View Confession 🤫"
    case "service_deal":
    case "wallet":
      return "Open Campus Wallet 💰"
    default:
      return "Open The College Date 🚀"
  }
}

function buildHtmlEmail({
  title,
  body,
  actionUrl,
  actionLabel,
}: {
  title: string
  body: string
  actionUrl: string
  actionLabel: string
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0b0f19; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #151c2e; border: 1px solid #243048; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);" cellspacing="0" cellpadding="0">
          <!-- Top Gradient Accent Bar -->
          <tr>
            <td style="height: 4px; background: linear-gradient(90deg, #ec4899, #8b5cf6, #3b82f6); font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>
          
          <!-- Header with Logo -->
          <tr>
            <td align="center" style="padding: 32px 24px 16px 24px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <img src="${LOGO_URL}" alt="The College Date" width="48" height="48" style="display: block; border-radius: 12px; margin-bottom: 12px;" />
                    <span style="font-size: 13px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #ec4899; display: block;">
                      The College Date
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Notification Content -->
          <tr>
            <td style="padding: 8px 32px 24px 32px; text-align: center;">
              <h1 style="margin: 0 0 14px 0; font-size: 22px; font-weight: 800; color: #ffffff; line-height: 1.35;">
                ${title}
              </h1>
              <p style="margin: 0 0 28px 0; font-size: 15px; color: #94a3b8; line-height: 1.6;">
                ${body}
              </p>

              <!-- CTA Button -->
              <div>
                <a href="${actionUrl}" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 9999px; box-shadow: 0 4px 16px rgba(236, 72, 153, 0.35); text-align: center;">
                  ${actionLabel}
                </a>
              </div>
            </td>
          </tr>

          <!-- Campus Safety Note -->
          <tr>
            <td style="padding: 16px 32px; background-color: #101625; border-top: 1px solid #1e293b; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                🔒 <strong>Campus Safety First:</strong> Never share passwords, bank details, or send money to anyone you haven't verified in person.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; text-align: center; border-top: 1px solid #1e293b;">
              <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; color: #94a3b8;">
                Designed for Africa's Universities 🌍
              </p>
              <p style="margin: 0 0 12px 0; font-size: 11px; color: #64748b; line-height: 1.5;">
                Sent from <a href="mailto:info@thecollegedate.com" style="color: #8b5cf6; text-decoration: none;">info@thecollegedate.com</a> to keep your campus connections alive.
              </p>
              <p style="margin: 0; font-size: 11px; color: #475569;">
                <a href="${SITE_URL}/settings" style="color: #64748b; text-decoration: underline;">Notification Preferences</a> &bull;
                <a href="${SITE_URL}/privacy.html" style="color: #64748b; text-decoration: underline;">Privacy Policy</a> &bull;
                <a href="${SITE_URL}/terms.html" style="color: #64748b; text-decoration: underline;">Terms of Service</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ─── SMTP Config & Dispatcher ─────────────────────────────────────────────────

interface SmtpConfig {
  host: string
  port: number
  user: string
  pass: string
  fromName: string
  fromEmail: string
}

function getSmtpConfig(): SmtpConfig | null {
  const host = normalizeSecret(Deno.env.get("SMTP_HOST")) || "smtp.hostinger.com"
  const rawPort = normalizeSecret(Deno.env.get("SMTP_PORT")) || "465"
  const port = Number(rawPort) || 465
  const user = normalizeSecret(Deno.env.get("SMTP_USER")) || "info@thecollegedate.com"
  const pass = normalizeSecret(Deno.env.get("SMTP_PASS"))
  const fromName = normalizeSecret(Deno.env.get("SMTP_FROM_NAME")) || "The College Date"
  const fromEmail = normalizeSecret(Deno.env.get("SMTP_FROM_EMAIL")) || user

  if (!pass) return null
  return { host, port, user, pass, fromName, fromEmail }
}

async function dispatchHostingerSmtp({
  config,
  to,
  subject,
  html,
  text,
}: {
  config: SmtpConfig
  to: string
  subject: string
  html: string
  text: string
}): Promise<{ messageId: string }> {
  const mailOptions = {
    from: `"${config.fromName}" <${config.fromEmail}>`,
    to,
    subject,
    text,
    html,
  }

  const attempts = [
    { port: config.port, secure: config.port === 465 },
    { port: config.port === 465 ? 587 : 465, secure: config.port !== 465 },
  ]

  let lastError: Error | null = null
  for (const attempt of attempts) {
    try {
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: attempt.port,
        secure: attempt.secure,
        auth: {
          user: config.user,
          pass: config.pass,
        },
        tls: {
          rejectUnauthorized: false,
        },
        connectionTimeout: 10000,
        greetingTimeout: 5000,
        socketTimeout: 15000,
      })

      const info = await transporter.sendMail(mailOptions)
      return { messageId: info.messageId }
    } catch (err: any) {
      lastError = err
      console.warn(`[EmailWorker] Attempt via port ${attempt.port} failed: ${err.message}`)
    }
  }

  throw lastError || new Error("All SMTP connection attempts failed.")
}

// ─── Queue Interfaces ─────────────────────────────────────────────────────────

interface QueueItem {
  id: string
  notification_id?: string | null
  user_id: string
  recipient_email?: string | null
  type?: string | null
  email_type?: string | null
  title?: string | null
  subject?: string | null
  body?: string | null
  content?: string | null
  action_url?: string | null
  metadata?: Record<string, unknown> | null
  status: string
  scheduled_for: string
  retry_count: number
  max_retries?: number
  dedupe_key?: string | null
  created_at: string
  updated_at: string
}

// ─── User Email Resolution Helper ─────────────────────────────────────────────

async function resolveUserEmail(
  supabaseAdmin: any,
  userId: string,
  cachedEmail?: string | null,
  cache?: Map<string, string>
): Promise<string | null> {
  if (cachedEmail && cachedEmail.includes("@")) {
    return cachedEmail
  }
  if (cache && cache.has(userId)) {
    return cache.get(userId) || null
  }

  // 1. Check auth.users via admin API
  try {
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId)
    if (!userError && userData?.user?.email) {
      const email = userData.user.email
      if (cache) cache.set(userId, email)
      return email
    }
  } catch (err: any) {
    console.warn(`[EmailWorker] Could not lookup user ${userId} in auth:`, err.message)
  }

  // 2. Check public.profiles fallback
  try {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .maybeSingle()

    if (profile?.email) {
      if (cache) cache.set(userId, profile.email)
      return profile.email
    }
  } catch (_err) {
    // Ignore profile fallback lookup error
  }

  return null
}

// ─── Queue Status Updater Helper ──────────────────────────────────────────────

async function updateQueueItemStatus(
  supabaseAdmin: any,
  id: string,
  status: string,
  details: {
    messageId?: string | null
    error?: string | null
    reason?: string | null
    retryCount?: number
    nextScheduledFor?: string
  } = {}
) {
  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  }

  if (status === "sent") {
    updateData.sent_at = new Date().toISOString()
    updateData.error_message = null
    updateData.failure_reason = null
  } else if (status === "failed") {
    updateData.failed_at = new Date().toISOString()
    const errorMsg = details.error || details.reason || "Failed"
    updateData.error_message = errorMsg
    updateData.failure_reason = errorMsg
    if (typeof details.retryCount === "number") {
      updateData.retry_count = details.retryCount
    }
  } else if (status === "pending" && details.nextScheduledFor) {
    updateData.scheduled_for = details.nextScheduledFor
    if (typeof details.retryCount === "number") {
      updateData.retry_count = details.retryCount
    }
    updateData.error_message = details.error || null
  } else if (status === "cancelled_read" || status === "skipped_preference") {
    const reasonMsg = details.reason || null
    updateData.error_message = reasonMsg
    updateData.failure_reason = reasonMsg
    if (status === "cancelled_read") {
      updateData.cancelled_at = new Date().toISOString()
    }
  }

  await supabaseAdmin
    .from("notification_email_queue")
    .update(updateData)
    .eq("id", id)
}

// ─── Batch Queue Processor ───────────────────────────────────────────────────

async function handleProcessQueue(
  payload: Record<string, unknown>,
  supabaseAdmin: any,
  smtpConfig: SmtpConfig
): Promise<Response> {
  const rawLimit = Number(payload.limit || payload.batchSize) || 25
  const limit = Math.min(Math.max(1, rawLimit), 50)
  const maxRetries = Number(payload.maxRetries) || 3

  // 1. Claim pending items (RPC with FOR UPDATE SKIP LOCKED, or optimistic fallback)
  let items: QueueItem[] = []

  try {
    const { data: rpcRows, error: rpcError } = await supabaseAdmin
      .rpc("claim_notification_email_batch", { p_limit: limit })

    if (!rpcError && Array.isArray(rpcRows) && rpcRows.length > 0) {
      items = rpcRows as QueueItem[]
    }
  } catch (rpcErr: any) {
    console.warn("[EmailWorker] claim_notification_email_batch RPC skipped:", rpcErr.message)
  }

  // Fallback to direct PostgREST selection if RPC was absent or returned 0
  if (items.length === 0) {
    const nowIso = new Date().toISOString()
    const { data: pendingRows, error: selectError } = await supabaseAdmin
      .from("notification_email_queue")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", nowIso)
      .order("scheduled_for", { ascending: true })
      .limit(limit)

    if (selectError) {
      console.error("[EmailWorker] Error querying pending queue items:", selectError.message)
      return new Response(
        JSON.stringify({ success: false, error: selectError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      )
    }

    if (pendingRows && pendingRows.length > 0) {
      for (const row of pendingRows) {
        // Optimistic lock
        const { data: locked, error: lockErr } = await supabaseAdmin
          .from("notification_email_queue")
          .update({ status: "processing", updated_at: nowIso })
          .eq("id", row.id)
          .eq("status", "pending")
          .select()
          .maybeSingle()

        if (!lockErr && locked) {
          items.push(locked as QueueItem)
        }
      }
    }
  }

  if (items.length === 0) {
    return new Response(
      JSON.stringify({ success: true, processed: 0, message: "Queue is empty" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    )
  }

  console.log(`[EmailWorker] Processing batch of ${items.length} queue item(s)`)

  const emailCache = new Map<string, string>()
  const results: Array<Record<string, unknown>> = []

  for (let i = 0; i < items.length; i++) {
    const item = items[i]

    // Rate-limiting intra-batch sleep (250ms) to respect Hostinger SMTP connection caps
    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, 250))
    }

    try {
      // 2. Pre-flight unread & presence check in public.notifications
      if (item.notification_id) {
        const { data: notif } = await supabaseAdmin
          .from("notifications")
          .select("id, is_read, read_at, seen_at, metadata")
          .eq("id", item.notification_id)
          .maybeSingle()

        if (notif) {
          if (notif.is_read === true || notif.read_at !== null) {
            await updateQueueItemStatus(supabaseAdmin, item.id, "cancelled_read", {
              reason: "already_read_on_platform",
            })
            results.push({ id: item.id, status: "cancelled_read", reason: "already_read_on_platform" })
            continue
          }

          const meta = notif.metadata as Record<string, unknown> | undefined
          if (meta?.suppress_email === true || meta?.suppressEmail === true || meta?.recipientIsActive === true) {
            await updateQueueItemStatus(supabaseAdmin, item.id, "cancelled_read", {
              reason: "suppressed_by_presence",
            })
            results.push({ id: item.id, status: "cancelled_read", reason: "suppressed_by_presence" })
            continue
          }
        }
      }

      // 3. User profile preferences check
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("email_notifications")
        .eq("id", item.user_id)
        .maybeSingle()

      if (profile && profile.email_notifications === false) {
        await updateQueueItemStatus(supabaseAdmin, item.id, "skipped_preference", {
          reason: "user_disabled_email_notifications",
        })
        results.push({ id: item.id, status: "skipped_preference", reason: "user_disabled_email_notifications" })
        continue
      }

      // 4. Resolve recipient email
      const recipientEmail = await resolveUserEmail(
        supabaseAdmin,
        item.user_id,
        item.recipient_email,
        emailCache
      )

      if (!recipientEmail) {
        await updateQueueItemStatus(supabaseAdmin, item.id, "failed", {
          reason: "No recipient email found",
          retryCount: (item.retry_count || 0) + 1,
        })
        results.push({ id: item.id, status: "failed", error: "No recipient email found" })
        continue
      }

      // 5. Construct email content
      const effectiveType = item.type || item.email_type || "general"
      const title = item.title || item.subject || "New update from The College Date"
      const body = item.body || item.content || "You have a new activity update waiting on The College Date."
      const subject = item.subject || title
      const actionUrl = normalizeUrl(item.action_url || undefined)
      const actionLabel = getActionLabel(effectiveType)

      const html = buildHtmlEmail({ title, body, actionUrl, actionLabel })
      const textFallback = `${title}\n\n${body}\n\nOpen link: ${actionUrl}\n\n--\nThe College Date (info@thecollegedate.com)`

      // 6. Dispatch via Hostinger SMTP
      const dispatchRes = await dispatchHostingerSmtp({
        config: smtpConfig,
        to: recipientEmail,
        subject,
        html,
        text: textFallback,
      })

      // 7. Success status update
      await updateQueueItemStatus(supabaseAdmin, item.id, "sent", {
        messageId: dispatchRes.messageId,
      })

      results.push({
        id: item.id,
        status: "sent",
        recipient: recipientEmail,
        messageId: dispatchRes.messageId,
      })

    } catch (itemErr: any) {
      console.error(`[EmailWorker] Error processing queue item ${item.id}:`, itemErr.message)
      const currentRetries = item.retry_count || 0
      const nextRetries = currentRetries + 1
      const itemMaxRetries = item.max_retries || maxRetries

      if (nextRetries >= itemMaxRetries) {
        await updateQueueItemStatus(supabaseAdmin, item.id, "failed", {
          error: itemErr.message,
          retryCount: nextRetries,
        })
        results.push({ id: item.id, status: "failed", error: itemErr.message })
      } else {
        // Exponential backoff retry: 5 mins, 10 mins, 20 mins
        const backoffMinutes = Math.pow(2, currentRetries) * 5
        const nextScheduledFor = new Date(Date.now() + backoffMinutes * 60 * 1000).toISOString()
        await updateQueueItemStatus(supabaseAdmin, item.id, "pending", {
          error: itemErr.message,
          retryCount: nextRetries,
          nextScheduledFor,
        })
        results.push({ id: item.id, status: "retrying", retryCount: nextRetries, nextScheduledFor })
      }
    }
  }

  const sentCount = results.filter((r) => r.status === "sent").length
  const cancelledCount = results.filter((r) => r.status === "cancelled_read").length
  const skippedCount = results.filter((r) => r.status === "skipped_preference").length
  const failedCount = results.filter((r) => r.status === "failed").length

  return new Response(
    JSON.stringify({
      success: true,
      processed: items.length,
      sent: sentCount,
      cancelled_read: cancelledCount,
      skipped_preference: skippedCount,
      failed: failedCount,
      results,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
  )
}

// ─── Direct Send Handler (Backward Compatibility) ─────────────────────────────

async function handleDirectSend(
  payload: Record<string, unknown>,
  supabaseAdmin: any,
  smtpConfig: SmtpConfig | null
): Promise<Response> {
  const {
    userId,
    recipientEmail: rawEmail,
    subject: customSubject,
    title: customTitle,
    body: customBody,
    actionUrl: rawActionUrl,
    type = "general",
  } = payload as Record<string, any>

  const title = customTitle || customSubject || "New update from The College Date"
  const body = customBody || "You have a new activity update waiting on The College Date."
  const subject = customSubject || title
  const actionUrl = normalizeUrl(rawActionUrl)
  const actionLabel = getActionLabel(type)

  // 1. Resolve Recipient Email
  let recipientEmail = rawEmail
  if (!recipientEmail && userId && supabaseAdmin) {
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId)
    if (userError) {
      console.warn(`[EmailFunction] Could not lookup user ${userId}:`, userError.message)
    } else {
      recipientEmail = userData?.user?.email
    }
  }

  if (!recipientEmail) {
    console.warn(`[EmailFunction] Skipped. No recipient email resolved for user: ${userId}`)
    return new Response(
      JSON.stringify({ success: false, skipped: true, message: "No recipient email found" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    )
  }

  if (!smtpConfig) {
    console.warn("[EmailFunction] Skipped. SMTP_PASS is not configured in Supabase secrets.")
    return new Response(
      JSON.stringify({
        success: false,
        skipped: true,
        message: "SMTP_PASS not configured in Supabase secrets",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    )
  }

  const html = buildHtmlEmail({ title, body, actionUrl, actionLabel })
  const textFallback = `${title}\n\n${body}\n\nOpen link: ${actionUrl}\n\n--\nThe College Date (info@thecollegedate.com)`

  console.log(`[EmailFunction] Direct sending notification email to: ${recipientEmail} (${subject}) via ${smtpConfig.host}:${smtpConfig.port}`)

  const dispatchRes = await dispatchHostingerSmtp({
    config: smtpConfig,
    to: recipientEmail,
    subject,
    html,
    text: textFallback,
  })

  return new Response(
    JSON.stringify({
      success: true,
      messageId: dispatchRes.messageId,
      recipient: recipientEmail,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
  )
}

// ─── Main Request Handler ─────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const payload = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

    const supabaseAdmin = (supabaseUrl && serviceKey)
      ? createClient(supabaseUrl, serviceKey)
      : null

    const smtpConfig = getSmtpConfig()

    // Route: Batch Queue Processor vs Direct Send
    if (payload?.action === "process-queue" || payload?.action === "process_queue") {
      if (!supabaseAdmin) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing database credentials" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        )
      }
      if (!smtpConfig) {
        return new Response(
          JSON.stringify({ success: false, skipped: true, error: "SMTP_PASS not configured" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        )
      }
      return await handleProcessQueue(payload, supabaseAdmin, smtpConfig)
    }

    // Default Route: Direct Send (backward compatibility)
    return await handleDirectSend(payload, supabaseAdmin, smtpConfig)

  } catch (error: any) {
    console.error("[EmailFunction] Error:", error.message)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    )
  }
})
