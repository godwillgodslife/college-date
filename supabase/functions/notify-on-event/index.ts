import { serve } from "https://deno.land/std@0.131.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID')
const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!)

// ─── Core OneSignal Sender ─────────────────────────────────────────────────────
async function sendNotification(payload: Record<string, unknown>) {
    const res = await fetch("https://onesignal.com/api/v1/notifications", {
        method: "POST",
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Authorization": `Basic ${ONESIGNAL_REST_API_KEY}`
        },
        body: JSON.stringify({ app_id: ONESIGNAL_APP_ID, ...payload })
    })
    const data = await res.json()
    console.log('OneSignal response:', JSON.stringify(data))
    return data
}

// ─── Fetch a profile's faculty + university for "shadow" messages ──────────────
async function getProfile(userId: string) {
    const { data } = await supabase
        .from('profiles')
        .select('faculty, university, full_name, available_balance')
        .eq('id', userId)
        .single()
    return data
}

serve(async (req) => {
    try {
        const payload = await req.json()
        console.log('Webhook payload received:', JSON.stringify(payload))

        const { type, table, record } = payload

        // ══════════════════════════════════════════════════
        // 1. SHADOW HOOK — New Like (swipe right)
        //    Hides the liker's identity to spark curiosity
        // ══════════════════════════════════════════════════
        if (table === 'swipes' && type === 'INSERT' && record.direction === 'right') {
            const swiperProfile = await getProfile(record.swiper_id)
            const faculty = swiperProfile?.faculty || 'your campus'

            await sendNotification({
                include_external_user_ids: [record.swiped_id],
                headings: { en: "Someone likes you! 👀" },
                contents: { en: `Someone from ${faculty} just swiped on you! Reveal who it is before they're gone.` },
                data: { type: 'swipe', url: '/match' },
                web_buttons: [
                    { id: "reveal", text: "Reveal Who 🔍", url: "https://campusdate.app/match" }
                ],
                android_sound: "default",
                ios_sound: "default"
            })
        }

        // ══════════════════════════════════════════════════
        // 2. MONEY ALERT — Paid transaction on swipe
        //    Dopamine loop: custom sound + wallet deep-link
        // ══════════════════════════════════════════════════
        else if (table === 'swipes' && type === 'UPDATE' && record.is_paid === true) {
            const receiverProfile = await getProfile(record.receiver_id ?? record.swiped_id)
            const balance = receiverProfile?.available_balance ?? 0
            const formatted = Number(balance).toLocaleString('en-NG')

            await sendNotification({
                include_external_user_ids: [record.receiver_id ?? record.swiped_id],
                headings: { en: "Credit Alert! 💰" },
                contents: { en: `You just earned ₦250. Your new balance is ₦${formatted}. Tap to see who paid for the vibe.` },
                data: { type: 'payment', swipe_id: record.id, url: '/wallet' },
                android_sound: "credit_alert",
                ios_sound: "credit_alert.wav",
                web_buttons: [
                    { id: "wallet", text: "Open Wallet 💳", url: "https://campusdate.app/wallet" }
                ]
            })
        }

        // ══════════════════════════════════════════════════
        // 3. PROFILE VIEW — Curiosity trigger
        //    "Someone from Uni X is checking your profile"
        // ══════════════════════════════════════════════════
        else if (table === 'profile_views' && type === 'INSERT') {
            const viewerProfile = await getProfile(record.viewer_id)
            const university = viewerProfile?.university || 'a nearby campus'

            await sendNotification({
                include_external_user_ids: [record.viewed_id],
                headings: { en: "Profile View 👁️" },
                contents: { en: `Someone from ${university} is checking out your profile right now. Make sure it's looking good!` },
                data: { type: 'profile_view', url: '/profile' },
                web_buttons: [
                    { id: "view_profile", text: "Update Profile", url: "https://campusdate.app/profile" }
                ],
                android_sound: "default",
                ios_sound: "default"
            })
        }

        // ══════════════════════════════════════════════════
        // 4. CAMPUS PULSE — Confession goes viral (>20 reactions)
        //    Blasts to users in the same university
        // ══════════════════════════════════════════════════
        else if (table === 'confessions' && (type === 'UPDATE' || type === 'INSERT')) {
            const reactionCount = (record.reaction_count ?? 0) + (record.comment_count ?? 0)
            if (reactionCount >= 20 && !record.pulse_notified) {
                // Fetch the confession author's university
                const authorProfile = await getProfile(record.user_id)
                const university = authorProfile?.university || 'your campus'

                // Fetch all users from that university to notify
                const { data: uniUsers } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('university', university)
                    .neq('id', record.user_id)

                const userIds = (uniUsers ?? []).map((u: { id: string }) => u.id)

                if (userIds.length > 0) {
                    await sendNotification({
                        include_external_user_ids: userIds,
                        headings: { en: "🔥 Campus is Talking!" },
                        contents: { en: `${university} is spilling tea ☕ Check the latest confession before it's deleted!` },
                        data: { type: 'confession', confession_id: record.id, url: '/confessions' },
                        web_buttons: [
                            { id: "read_confession", text: "Read It 📜", url: "https://campusdate.app/confessions" }
                        ],
                        android_sound: "default",
                        ios_sound: "default"
                    })

                    // Mark as notified so we don't spam
                    await supabase
                        .from('confessions')
                        .update({ pulse_notified: true })
                        .eq('id', record.id)
                }
            }
        }

        // ══════════════════════════════════════════════════
        // 5. RETENTION GHOST — Weekly leaderboard alert
        //    Triggers via an external cron job hitting this endpoint
        //    with { type: 'LEADERBOARD_PULSE', user_id, rank_change }
        // ══════════════════════════════════════════════════
        else if (payload.type === 'LEADERBOARD_PULSE') {
            const { user_id, rank_change, new_rank, rival_name } = payload
            const direction = rank_change > 0 ? `dropped ${rank_change}` : `gained ${Math.abs(rank_change)}`
            const emoji = rank_change > 0 ? '📉' : '📈'

            await sendNotification({
                include_external_user_ids: [user_id],
                headings: { en: `Leaderboard Update ${emoji}` },
                contents: { en: `You ${direction} spots! ${rival_name} is catching up. Swipe now to reclaim your #${new_rank} spot.` },
                data: { type: 'leaderboard', url: '/leaderboard' },
                web_buttons: [
                    { id: "leaderboard", text: "See Rankings 🏆", url: "https://campusdate.app/leaderboard" }
                ],
                android_sound: "default",
                ios_sound: "default"
            })
        }

        // ══════════════════════════════════════════════════
        // 6. GHOST RE-ENGAGEMENT — 48h idle user blast
        //    Triggers via external cron job hitting this endpoint
        //    with { type: 'GHOST_PULSE', user_id, new_users_count }
        // ══════════════════════════════════════════════════
        else if (payload.type === 'GHOST_PULSE') {
            const { user_id, new_users_count } = payload
            const count = new_users_count || 15

            await sendNotification({
                include_external_user_ids: [user_id],
                headings: { en: "The campus is buzzing! 🐝" },
                contents: { en: `${count} new students from your level just joined. See who's online before they get swiped up!` },
                data: { type: 're_engagement', url: '/match' },
                web_buttons: [
                    { id: "explore", text: "See Who Joined 👀", url: "https://campusdate.app/match" }
                ],
                android_sound: "default",
                ios_sound: "default"
            })
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json" },
            status: 200,
        })

    } catch (error) {
        console.error('Error processing webhook:', error)
        return new Response(JSON.stringify({ error: (error as Error).message }), {
            headers: { "Content-Type": "application/json" },
            status: 400,
        })
    }
})
