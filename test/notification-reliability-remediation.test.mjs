import test from 'node:test';
import assert from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

test('Notification Reliability Remediation: createNotification and sendPushNotification', () => {
    const notifServicePath = resolve(process.cwd(), 'src/services/notificationService.js');
    const source = readFileSync(notifServicePath, 'utf8');

    // 1. ReferenceError fix: actionUrl must be derived from effectiveDeepLink/getAbsoluteWebUrl
    assert.strictEqual(
        source.includes('actionUrl: effectiveDeepLink ? getAbsoluteWebUrl(effectiveDeepLink) : undefined'),
        true,
        'sendEmailNotification must receive properly resolved actionUrl, not undeclared variable'
    );
    assert.strictEqual(
        /\s+actionUrl,\s+type/.test(source),
        false,
        'Undeclared bare actionUrl must not exist in createNotification'
    );

    // 2. getActivePushTargets must support get_user_push_subscriptions RPC
    assert.strictEqual(
        source.includes('supabase.rpc(\'get_user_push_subscriptions\''),
        true,
        'getActivePushTargets must attempt secure RPC lookup to bypass RLS'
    );

    // 3. sendPushNotification must pass userId
    assert.strictEqual(
        source.includes('userId,'),
        true,
        'sendPushNotification call must include userId'
    );
});

test('Notification Reliability Remediation: Edge Function push resolution', () => {
    const edgeFuncPath = resolve(process.cwd(), 'supabase/functions/send-notification-push/index.ts');
    const source = readFileSync(edgeFuncPath, 'utf8');

    // 1. Supabase client import
    assert.strictEqual(
        source.includes('createClient'),
        true,
        'Edge Function must import createClient for service_role database lookup'
    );

    // 2. Query user_notification_devices with service_role
    assert.strictEqual(
        source.includes('.from("user_notification_devices")'),
        true,
        'Edge Function must query user_notification_devices'
    );
    assert.strictEqual(
        source.includes('SUPABASE_SERVICE_ROLE_KEY'),
        true,
        'Edge Function must use SUPABASE_SERVICE_ROLE_KEY to bypass RLS'
    );
});

test('Notification Reliability Remediation: Database migration get_user_push_subscriptions', () => {
    const migrationPath = resolve(process.cwd(), 'supabase/migrations/20261001150000_get_user_push_subscriptions.sql');
    assert.strictEqual(existsSync(migrationPath), true, 'Migration file must exist');

    const sql = readFileSync(migrationPath, 'utf8');
    assert.strictEqual(
        sql.includes('CREATE OR REPLACE FUNCTION public.get_user_push_subscriptions'),
        true,
        'Must define get_user_push_subscriptions function'
    );
    assert.strictEqual(
        sql.includes('SECURITY DEFINER'),
        true,
        'Function must be SECURITY DEFINER to bypass table RLS'
    );
    assert.strictEqual(
        sql.includes('GRANT EXECUTE ON FUNCTION public.get_user_push_subscriptions'),
        true,
        'Function must grant execute permissions'
    );
});
