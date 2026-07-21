import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paystack-signature',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
        return json({ ok: false, message: 'Method not allowed' }, 405);
    }

    const rawBody = await req.text();

    try {
        const paystackKey = Deno.env.get('PAYSTACK_SECRET_KEY') ?? '';
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

        if (!paystackKey || !supabaseUrl || !serviceRoleKey) {
            return json({ ok: false, message: 'Paystack webhook is not configured' }, 500);
        }

        const signature = req.headers.get('x-paystack-signature') ?? '';
        const expectedSignature = await hmacSha512Hex(paystackKey, rawBody);
        if (!constantTimeEqual(signature, expectedSignature)) {
            return json({ ok: false, message: 'Invalid signature' }, 401);
        }

        const payload = JSON.parse(rawBody);
        const eventType = String(payload?.event ?? 'unknown');
        const data = payload?.data ?? {};
        const reference = data?.reference ? String(data.reference) : null;
        const payloadHash = await sha256Hex(rawBody);
        const providerEventId = String(data?.id ?? `${eventType}:${reference ?? 'no-reference'}:${payloadHash}`);
        const sanitizedPayload = sanitizePaystackEvent(payload);

        const supabase = createClient(supabaseUrl, serviceRoleKey);

        const { data: eventRow, error: insertError } = await supabase
            .from('provider_webhook_events')
            .insert({
                provider: 'paystack',
                provider_event_id: providerEventId,
                event_type: eventType,
                provider_reference: reference,
                payload_hash: payloadHash,
                payload: sanitizedPayload,
                processing_status: 'received',
            })
            .select('id')
            .single();

        if (insertError) {
            if (insertError.code === '23505') {
                return json({ ok: true, duplicate: true });
            }
            throw insertError;
        }

        if (eventType !== 'charge.success') {
            await markWebhookEvent(supabase, eventRow.id, 'ignored', 'Non-charge.success event');
            return json({ ok: true, ignored: true, event_type: eventType });
        }

        if (!reference) {
            await markWebhookEvent(supabase, eventRow.id, 'failed', 'Missing Paystack reference');
            return json({ ok: false, message: 'Missing reference' }, 400);
        }

        const { data: attempt, error: attemptError } = await supabase
            .from('payment_attempts')
            .select('id, product_id, provider_reference, expected_amount, currency, status')
            .eq('provider', 'paystack')
            .eq('provider_reference', reference)
            .maybeSingle();

        if (attemptError) throw attemptError;
        if (!attempt) {
            await markWebhookEvent(supabase, eventRow.id, 'ignored', 'No matching payment attempt');
            return json({ ok: true, ignored: true, message: 'No matching payment attempt' });
        }

        if (attempt.status === 'processed') {
            await markWebhookEvent(supabase, eventRow.id, 'processed');
            return json({ ok: true, idempotent: true, message: 'Payment already processed' });
        }

        const paidAmount = Number(data?.amount ?? 0) / 100;
        const expectedAmount = Number(attempt.expected_amount ?? 0);
        const paidCurrency = String(data?.currency ?? '').toUpperCase();
        const expectedCurrency = String(attempt.currency ?? 'NGN').toUpperCase();

        const amountMatches = Math.round(paidAmount * 100) === Math.round(expectedAmount * 100);
        const currencyMatches = paidCurrency === expectedCurrency;
        const statusMatches = data?.status === 'success';
        const referenceMatches = String(data?.reference ?? '') === attempt.provider_reference;

        if (!amountMatches || !currencyMatches || !statusMatches || !referenceMatches) {
            await supabase
                .from('payment_attempts')
                .update({
                    status: 'mismatch',
                    provider_status: 'webhook_mismatch',
                    provider_response: sanitizedPayload,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', attempt.id);

            await markWebhookEvent(supabase, eventRow.id, 'failed', 'Payment details did not match server-created attempt');
            return json({ ok: false, message: 'Payment details did not match server-created attempt' }, 409);
        }

        await supabase
            .from('payment_attempts')
            .update({
                status: 'verified',
                provider_status: 'success',
                provider_response: sanitizedPayload,
                verified_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', attempt.id);

        const { data: processed, error: processError } = await supabase.rpc('process_verified_payment', {
            p_provider: 'paystack',
            p_provider_reference: reference,
            p_provider_status: 'success',
            p_provider_payload: sanitizedPayload,
        });

        if (processError) throw processError;
        if (!processed?.success) {
            await markWebhookEvent(supabase, eventRow.id, 'failed', processed?.error || 'Processing failed');
            return json({ ok: false, message: processed?.error || 'Processing failed' }, 500);
        }

        await markWebhookEvent(supabase, eventRow.id, 'processed');
        return json({ ok: true, result: processed });
    } catch (err) {
        console.error('paystack-webhook error:', err);
        return json({ ok: false, message: err instanceof Error ? err.message : 'Internal server error' }, 500);
    }
});

async function markWebhookEvent(supabase: any, id: string, status: string, failureReason?: string) {
    await supabase
        .from('provider_webhook_events')
        .update({
            processing_status: status,
            failure_reason: failureReason ?? null,
            processed_at: new Date().toISOString(),
        })
        .eq('id', id);
}

async function hmacSha512Hex(secret: string, message: string) {
    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
        { name: 'HMAC', hash: 'SHA-512' },
        false,
        ['sign'],
    );
    const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
    return toHex(signature);
}

async function sha256Hex(message: string) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message));
    return toHex(digest);
}

function toHex(buffer: ArrayBuffer) {
    return [...new Uint8Array(buffer)]
        .map((value) => value.toString(16).padStart(2, '0'))
        .join('');
}

function constantTimeEqual(left: string, right: string) {
    if (left.length !== right.length) return false;

    let result = 0;
    for (let i = 0; i < left.length; i += 1) {
        result |= left.charCodeAt(i) ^ right.charCodeAt(i);
    }

    return result === 0;
}

function sanitizePaystackEvent(payload: Record<string, unknown>) {
    const data = payload?.data as Record<string, unknown> | undefined;
    return {
        event: payload?.event ?? null,
        data: data
            ? {
                id: data.id ?? null,
                status: data.status ?? null,
                reference: data.reference ?? null,
                amount: data.amount ?? null,
                currency: data.currency ?? null,
                paid_at: data.paid_at ?? null,
                channel: data.channel ?? null,
                gateway_response: data.gateway_response ?? null,
            }
            : null,
    };
}

function json(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}
