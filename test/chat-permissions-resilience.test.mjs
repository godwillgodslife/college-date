import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const CHAT_SERVICE_PATH = path.resolve('src/services/chatService.js');
const USE_SWR_PATH = path.resolve('src/hooks/useSWRData.js');
const MIGRATION_PATH = path.resolve('supabase/migrations/20261013040000_grant_messages_table_permissions.sql');

test('Chat Permissions Resilience: Static Code Analysis', () => {
    const chatServiceCode = fs.readFileSync(CHAT_SERVICE_PATH, 'utf8');
    const useSwrCode = fs.readFileSync(USE_SWR_PATH, 'utf8');
    const migrationSql = fs.readFileSync(MIGRATION_PATH, 'utf8');

    // 1. Check getConversations does NOT request metadata in nested messages select
    assert.ok(
        !chatServiceCode.includes('messages(\n                    id,\n                    content,\n                    type,\n                    sender_id,\n                    is_read,\n                    created_at,\n                    expires_at,\n                    metadata'),
        'getConversations must NOT include metadata in nested messages select'
    );

    // 2. Check getConversations defines SAFE_MESSAGE_COLUMNS
    assert.ok(
        chatServiceCode.includes('const SAFE_MESSAGE_COLUMNS'),
        'chatService must define SAFE_MESSAGE_COLUMNS'
    );

    // 3. Check getConversations has RPC fallback
    assert.ok(
        chatServiceCode.includes("rpc('get_native_conversations'"),
        'getConversations must fall back to get_native_conversations RPC'
    );

    // 4. Check getMessages has RPC fallback
    assert.ok(
        chatServiceCode.includes("rpc('get_native_messages'"),
        'getMessages must fall back to get_native_messages RPC'
    );

    // 5. Check sendMessage has RPC fallback
    assert.ok(
        chatServiceCode.includes("rpc('send_native_text_message'"),
        'sendMessage must fall back to send_native_text_message RPC'
    );

    // 6. Check markConversationRead calls mark_native_messages_read
    assert.ok(
        chatServiceCode.includes("rpc('mark_native_messages_read'"),
        'markConversationRead must call mark_native_messages_read RPC'
    );

    // 7. Check useConversations handles errors safely without crashing ErrorBoundary
    assert.ok(
        useSwrCode.includes('useConversations warning'),
        'useConversations must log warning instead of throwing unhandled error to ErrorBoundary'
    );

    // 8. Check migration contains table-level grants
    assert.ok(
        migrationSql.includes('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.messages TO authenticated;'),
        'Migration must grant SELECT, INSERT, UPDATE, DELETE on messages to authenticated'
    );
    assert.ok(
        migrationSql.includes('GRANT ALL ON TABLE public.messages TO service_role;'),
        'Migration must grant ALL on messages to service_role'
    );

    // 9. Check UUID nonce normalization in chatService
    assert.ok(
        chatServiceCode.includes('UUID_V4_REGEX'),
        'chatService must define UUID_V4_REGEX'
    );
    assert.ok(
        chatServiceCode.includes('toValidUuidNonce'),
        'chatService must export toValidUuidNonce'
    );
    assert.ok(
        chatServiceCode.includes('p_client_nonce: validNonce'),
        'chatService must pass validated UUID nonce to send_native_text_message RPC'
    );
});

test('Chat Permissions Resilience: UUID Nonce Integrity', async () => {
    const { createClientNonce, toValidUuidNonce, MESSAGE_UUID_REGEX } = await import('../src/utils/messageInfo.js');
    const UUID_V4_REGEX = MESSAGE_UUID_REGEX;

    assert.ok(UUID_V4_REGEX instanceof RegExp, 'UUID_V4_REGEX must be a RegExp');

    for (let i = 0; i < 50; i++) {
        const generated = createClientNonce();
        assert.ok(
            UUID_V4_REGEX.test(generated),
            `Generated nonce ${generated} must conform to RFC 4122 UUID v4 regex`
        );
    }

    // Invalid nonces must be converted to valid UUID v4
    const fromLegacy = toValidUuidNonce('msg-1791903689-abc1234');
    assert.ok(
        UUID_V4_REGEX.test(fromLegacy),
        'Legacy string nonce must be normalized to valid UUID v4'
    );

    const fromUndefined = toValidUuidNonce(undefined);
    assert.ok(
        UUID_V4_REGEX.test(fromUndefined),
        'Undefined nonce must generate valid UUID v4'
    );

    // Existing valid UUID must be preserved
    const validUuid = '12345678-1234-4234-8234-123456789abc';
    assert.strictEqual(
        toValidUuidNonce(validUuid),
        validUuid,
        'Valid UUID must be preserved unchanged'
    );
});

test('Chat Permissions Resilience: Live Supabase Query Execution', async () => {
    const env = fs.readFileSync('.env', 'utf8');
    let url = '', anon = '';
    for (const l of env.split('\n')) {
        if (l.startsWith('VITE_SUPABASE_URL=')) url = l.split('=')[1].trim();
        if (l.startsWith('VITE_SUPABASE_ANON_KEY=')) anon = l.split('=')[1].trim();
    }

    if (!url || !anon) {
        console.warn('Skipping live integration test: no Supabase credentials in .env');
        return;
    }

    const supabase = createClient(url, anon);
    const authRes = await supabase.auth.signInWithPassword({
        email: 'student.tester2026@gmail.com',
        password: 'CollegeDate2026!VerifiedPass'
    });

    assert.ok(!authRes.error, 'Test user authentication must succeed');
    const userId = authRes.data.user.id;

    // 1. Test direct matches query WITHOUT ungranted metadata column
    const directQuery = await supabase
        .from('matches')
        .select(`
            id,
            created_at,
            user1_id,
            user2_id,
            disappearing_messages_seconds,
            user1:profiles!user1_id(id, full_name, avatar_url, profile_photos, photo_updated_at, updated_at, last_seen_at, is_verified, photo_verified, university),
            user2:profiles!user2_id(id, full_name, avatar_url, profile_photos, photo_updated_at, updated_at, last_seen_at, is_verified, photo_verified, university),
            messages(
                id,
                content,
                type,
                sender_id,
                is_read,
                created_at,
                expires_at
            )
        `)
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .order('created_at', { ascending: false, foreignTable: 'messages' })
        .limit(1, { foreignTable: 'messages' });

    assert.strictEqual(directQuery.error, null, 'Direct matches query without metadata must succeed (200 OK)');
    assert.ok(Array.isArray(directQuery.data), 'Direct matches query must return an array');
    assert.ok(directQuery.data.length > 0, 'Matches list should not be empty');

    const firstMatch = directQuery.data[0];
    assert.ok(firstMatch.id, 'Match must have an id');

    // 2. Test get_native_conversations RPC fallback
    const rpcConvs = await supabase.rpc('get_native_conversations', {
        p_limit: 50,
        p_offset: 0
    });
    assert.strictEqual(rpcConvs.error, null, 'get_native_conversations RPC must succeed');
    assert.ok(Array.isArray(rpcConvs.data), 'get_native_conversations must return array');
    assert.ok(rpcConvs.data.length > 0, 'get_native_conversations must return at least 1 conversation');

    // 3. Test get_native_messages RPC
    const rpcMsgs = await supabase.rpc('get_native_messages', {
        p_match_id: firstMatch.id,
        p_limit: 20
    });
    assert.strictEqual(rpcMsgs.error, null, 'get_native_messages RPC must succeed');
    assert.ok(Array.isArray(rpcMsgs.data), 'get_native_messages must return array');

    // 4. Test mark_native_messages_read RPC
    const rpcMarkRead = await supabase.rpc('mark_native_messages_read', {
        p_match_id: firstMatch.id
    });
    assert.strictEqual(rpcMarkRead.error, null, 'mark_native_messages_read RPC must succeed');

    // 5. Test send_native_text_message RPC
    const rpcSend = await supabase.rpc('send_native_text_message', {
        p_match_id: firstMatch.id,
        p_content: 'Automated resilience verification ping ✨',
        p_client_nonce: '00000000-0000-4000-8000-' + Math.random().toString(16).substring(2, 14).padEnd(12, '0')
    });
    assert.strictEqual(rpcSend.error, null, 'send_native_text_message RPC must succeed');
    assert.ok(rpcSend.data?.[0]?.id, 'send_native_text_message must return inserted message');
});
