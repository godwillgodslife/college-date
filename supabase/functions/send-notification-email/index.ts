import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import nodemailer from "npm:nodemailer@6.9.10"
import { corsHeaders } from "../_shared/cors.ts"

const SITE_URL = "https://www.thecollegedate.com"
const LOGO_URL = `${SITE_URL}/logo.png`

function normalizeUrl(url?: string) {
  if (!url || typeof url !== "string") return SITE_URL
  if (url.startsWith("http://") || url.startsWith("https://")) return url
  if (url.startsWith("/")) return `${SITE_URL}${url}`
  return `${SITE_URL}/${url}`
}

function getActionLabel(type?: string) {
  switch (type) {
    case "match":
      return "View Your Match 🔥"
    case "like":
    case "super_swipe":
    case "request":
      return "View Connection Request 💌"
    case "chat":
    case "message":
      return "Reply in Chat 💬"
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
}) {
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

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    const {
      userId,
      recipientEmail: rawEmail,
      subject: customSubject,
      title: customTitle,
      body: customBody,
      actionUrl: rawActionUrl,
      type = "general",
    } = payload

    const title = customTitle || customSubject || "New update from The College Date"
    const body = customBody || "You have a new activity update waiting on The College Date."
    const subject = customSubject || title
    const actionUrl = normalizeUrl(rawActionUrl)
    const actionLabel = getActionLabel(type)

    // 1. Resolve Recipient Email
    let recipientEmail = rawEmail
    if (!recipientEmail && userId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

      if (supabaseUrl && serviceKey) {
        const supabaseAdmin = createClient(supabaseUrl, serviceKey)
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId)

        if (userError) {
          console.warn(`[EmailFunction] Could not lookup user ${userId}:`, userError.message)
        } else {
          recipientEmail = userData?.user?.email
        }
      }
    }

    if (!recipientEmail) {
      console.warn(`[EmailFunction] Skipped. No recipient email resolved for user: ${userId}`)
      return new Response(
        JSON.stringify({ success: false, skipped: true, message: "No recipient email found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      )
    }

function normalizeSecret(value: string | undefined) {
  if (!value) return ""
  return value.trim().replace(/^['"]|['"]$/g, "")
}

    // 2. Resolve SMTP Settings (Hostinger default)
    const smtpHost = normalizeSecret(Deno.env.get("SMTP_HOST")) || "smtp.hostinger.com"
    const rawPort = normalizeSecret(Deno.env.get("SMTP_PORT")) || "465"
    const smtpPort = Number(rawPort) || 465
    const smtpUser = normalizeSecret(Deno.env.get("SMTP_USER")) || "info@thecollegedate.com"
    const smtpPass = normalizeSecret(Deno.env.get("SMTP_PASS"))
    const fromName = normalizeSecret(Deno.env.get("SMTP_FROM_NAME")) || "The College Date"
    const fromEmail = normalizeSecret(Deno.env.get("SMTP_FROM_EMAIL")) || smtpUser

    if (!smtpPass) {
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

    console.log(`[EmailFunction] Sending notification email to: ${recipientEmail} (${subject}) via ${smtpHost}:${smtpPort}`)

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: recipientEmail,
      subject: subject,
      text: textFallback,
      html: html,
    }

    // 3. Send with automatic fallback between Port 465 (SSL) and Port 587 (STARTTLS)
    let info
    let lastError: Error | null = null

    const attempts = [
      { port: smtpPort, secure: smtpPort === 465 },
      { port: smtpPort === 465 ? 587 : 465, secure: smtpPort !== 465 },
    ]

    for (const attempt of attempts) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: attempt.port,
          secure: attempt.secure,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
          tls: {
            rejectUnauthorized: false,
          },
        })

        info = await transporter.sendMail(mailOptions)
        console.log(`[EmailFunction] Delivered successfully via port ${attempt.port}. Message ID: ${info.messageId}`)
        break
      } catch (err) {
        lastError = err
        console.warn(`[EmailFunction] Attempt via port ${attempt.port} failed: ${err.message}`)
      }
    }

    if (!info) {
      throw lastError || new Error("All SMTP connection attempts failed.")
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageId: info.messageId,
        recipient: recipientEmail,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    )
  } catch (error) {
    console.error("[EmailFunction] Delivery error:", error.message)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    )
  }
})
