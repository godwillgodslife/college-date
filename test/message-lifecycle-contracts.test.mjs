import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    getMessageInfo,
    isValidMessageId,
    isMessageDeletedForUser
} from '../src/utils/messageInfo.js';

const MIGRATION_PATH = resolve('supabase/migrations/20260930190000_message_interactions_and_lifecycle.sql');
const CHAT_SERVICE_PATH = resolve('src/services/chatService.js');

test('Message Lifecycle Migration: Schema extensions, sync triggers, and indexes', () => {
    const sql = readFileSync(MIGRATION_PATH, 'utf8');

    // 1. Column extensions
    assert.ok(sql.includes('ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS seen_at timestamptz;'),
        'Must add seen_at column to public.messages');

    // 2. Trigger for read_at / seen_at sync
    assert.ok(sql.includes('CREATE OR REPLACE FUNCTION public.sync_message_read_state()'),
        'Must define sync_message_read_state trigger function');
    assert.ok(sql.includes('CREATE TRIGGER trigger_sync_message_read_state'),
        'Must attach trigger to public.messages for is_read, read_at, seen_at');

    // 3. Performance indexing
    assert.ok(sql.includes('idx_messages_metadata_deleted_for'),
        'Must create GIN index on metadata->deleted_for');

    // 4. RLS Policy
    assert.ok(sql.includes('DROP POLICY IF EXISTS "Native match participants can read messages" ON public.messages;'),
        'Must update RLS read policy');
    assert.ok(sql.includes("coalesce(metadata->'deleted_for', '[]'::jsonb) @> to_jsonb(auth.uid()::text)"),
        'RLS policy must exclude messages deleted for the authenticated user');
});

test('Message Lifecycle Migration: edit_chat_message enforces text-only and unread-only contract', () => {
    const sql = readFileSync(MIGRATION_PATH, 'utf8');

    assert.ok(sql.includes('CREATE OR REPLACE FUNCTION public.edit_chat_message'),
        'Must create or replace edit_chat_message');
    assert.ok(sql.includes("coalesce(v_msg.type, 'text') <> 'text'"),
        'Must check message type is text only');
    assert.ok(sql.includes("'Only text messages can be edited'"),
        'Must reject non-text message editing');

    // Seen/read check
    assert.ok(sql.includes("coalesce(v_msg.is_read, false) = true OR v_msg.read_at IS NOT NULL OR v_msg.seen_at IS NOT NULL"),
        'Must check if message was read or seen');
    assert.ok(sql.includes("'Cannot edit a message that has already been seen'"),
        'Must reject edit if message has already been seen');

    // 15-minute window
    assert.ok(sql.includes("v_msg.created_at < (now() - interval '15 minutes')"),
        'Must enforce 15 minute edit window');

    // Metadata updates
    assert.ok(sql.includes("jsonb_set(v_metadata, '{is_edited}', 'true'::jsonb)"),
        'Must set is_edited to true');
    assert.ok(sql.includes("jsonb_set(v_metadata, '{edited_at}', to_jsonb(now()::text))"),
        'Must set edited_at timestamp');
});

test('Message Lifecycle Migration: delete_chat_message enforces unread-only deletion for everyone', () => {
    const sql = readFileSync(MIGRATION_PATH, 'utf8');

    assert.ok(sql.includes('CREATE OR REPLACE FUNCTION public.delete_chat_message('),
        'Must create or replace delete_chat_message');
    assert.ok(sql.includes('CREATE OR REPLACE FUNCTION public.delete_chat_message_for_everyone('),
        'Must provide delete_chat_message_for_everyone RPC');

    // Seen/read rejection
    assert.ok(sql.includes("'Cannot delete for everyone after message has been seen'"),
        'Must reject delete for everyone if message has already been seen');

    // Tombstone payload
    assert.ok(sql.includes("type = 'deleted'"),
        'Must set type = deleted');
    assert.ok(sql.includes("content = 'This message was deleted'"),
        'Must set content to deleted tombstone');
    assert.ok(sql.includes("jsonb_set(v_metadata, '{is_deleted}', 'true'::jsonb)"),
        'Must set is_deleted flag');
    assert.ok(sql.includes("jsonb_set(v_metadata, '{deleted_at}', to_jsonb(now()::text))"),
        'Must set deleted_at timestamp');
});

test('Message Lifecycle Migration: delete_chat_message_for_me appends caller to deleted_for', () => {
    const sql = readFileSync(MIGRATION_PATH, 'utf8');

    assert.ok(sql.includes('CREATE OR REPLACE FUNCTION public.delete_chat_message_for_me('),
        'Must define delete_chat_message_for_me');
    assert.ok(sql.includes('v_user_id IN (mat.user1_id, mat.user2_id)'),
        'Must verify caller is a match participant');
    assert.ok(sql.includes("jsonb_set(v_metadata, '{deleted_for}', v_deleted_for || to_jsonb(v_user_id::text))"),
        'Must append caller user ID to deleted_for array');
});

test('Message Lifecycle Migration: get_native_messages and get_native_conversations filter deleted_for', () => {
    const sql = readFileSync(MIGRATION_PATH, 'utf8');

    assert.ok(sql.includes("AND NOT (coalesce(msg.metadata->'deleted_for', '[]'::jsonb) @> to_jsonb(v_user_id::text))"),
        'get_native_messages must filter out messages deleted for caller');
    assert.ok(sql.includes("AND NOT (coalesce(unread.metadata->'deleted_for', '[]'::jsonb) @> to_jsonb(v_user_id::text))"),
        'get_native_conversations must filter out messages deleted for caller in unread count');
});

test('Chat Service: getMessageInfo extracts sent, delivered, and seen timestamps correctly', () => {
    const rawMessage = {
        id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
        created_at: '2026-09-30T12:00:00.000Z',
        delivered_at: '2026-09-30T12:00:01.000Z',
        read_at: '2026-09-30T12:05:00.000Z',
        seen_at: '2026-09-30T12:05:00.000Z',
        is_read: true,
        type: 'text',
        content: 'Hey there campus!',
        metadata: {
            is_edited: true,
            edited_at: '2026-09-30T12:02:00.000Z',
            deleted_for: ['user-123']
        }
    };

    const info = getMessageInfo(rawMessage);

    assert.strictEqual(info.id, '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d');
    assert.strictEqual(info.sent_at, '2026-09-30T12:00:00.000Z');
    assert.strictEqual(info.delivered_at, '2026-09-30T12:00:01.000Z');
    assert.strictEqual(info.seen_at, '2026-09-30T12:05:00.000Z');
    assert.strictEqual(info.read_at, '2026-09-30T12:05:00.000Z');
    assert.strictEqual(info.is_seen, true);
    assert.strictEqual(info.is_edited, true);
    assert.strictEqual(info.edited_at, '2026-09-30T12:02:00.000Z');
    assert.strictEqual(info.is_deleted, false);
    assert.deepStrictEqual(info.deleted_for, ['user-123']);
});

test('Chat Service: getMessageInfo defaults delivered_at to created_at when delivered_at not explicit', () => {
    const rawMessage = {
        id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
        created_at: '2026-09-30T14:30:00.000Z',
        is_read: false,
        type: 'text',
        content: 'Campus meetup',
        metadata: {}
    };

    const info = getMessageInfo(rawMessage);

    assert.strictEqual(info.sent_at, '2026-09-30T14:30:00.000Z');
    assert.strictEqual(info.delivered_at, '2026-09-30T14:30:00.000Z', 'On server storage delivery is immediate upon created_at');
    assert.strictEqual(info.seen_at, null);
    assert.strictEqual(info.is_seen, false);
});

test('Chat Service Validation: isValidMessageId blocks temp IDs and non-UUIDs', () => {
    const validUuid = 'c387cf3e-c6e7-4bd3-875f-b52ad6933f7c';
    const tempId1 = 'temp-1789820523052';
    const tempId2 = 'temp-1789822665083';
    const invalidId = 'not-a-uuid';

    assert.strictEqual(isValidMessageId(validUuid), true, 'Valid UUID must pass');
    assert.strictEqual(isValidMessageId(tempId1), false, 'Temp ID must be blocked');
    assert.strictEqual(isValidMessageId(tempId2), false, 'Temp ID must be blocked');
    assert.strictEqual(isValidMessageId(invalidId), false, 'Invalid string must be blocked');
    assert.strictEqual(isValidMessageId(null), false, 'Null must be blocked');
    assert.strictEqual(isValidMessageId(undefined), false, 'Undefined must be blocked');
});

test('Chat Service Filtering: isMessageDeletedForUser checks deleted_for array', () => {
    const userA = 'user-uuid-1111';
    const userB = 'user-uuid-2222';
    const userC = 'user-uuid-3333';

    const messageWithDeletedFor = {
        id: 'msg-1',
        metadata: {
            deleted_for: [userA, userB]
        }
    };

    assert.strictEqual(isMessageDeletedForUser(messageWithDeletedFor, userA), true);
    assert.strictEqual(isMessageDeletedForUser(messageWithDeletedFor, userB), true);
    assert.strictEqual(isMessageDeletedForUser(messageWithDeletedFor, userC), false);
    assert.strictEqual(isMessageDeletedForUser(null, userA), false);
    assert.strictEqual(isMessageDeletedForUser(messageWithDeletedFor, null), false);
});

test('Chat Service Source: wires all required database RPCs and functions', () => {
    const code = readFileSync(CHAT_SERVICE_PATH, 'utf8');

    assert.ok(code.includes("rpc('edit_chat_message'"), 'Must call edit_chat_message RPC');
    assert.ok(code.includes("rpc('delete_chat_message_for_everyone'"), 'Must call delete_chat_message_for_everyone RPC');
    assert.ok(code.includes("rpc('delete_chat_message'"), 'Must fall back to delete_chat_message RPC');
    assert.ok(code.includes("rpc('delete_chat_message_for_me'"), 'Must call delete_chat_message_for_me RPC');
    assert.ok(code.includes('isMessageDeletedForUser'), 'Must use isMessageDeletedForUser in chatService');
    assert.ok(code.includes('export { getMessageInfo'), 'Must export getMessageInfo helper');
    assert.ok(code.includes('export async function deleteMessageForEveryone'), 'Must export deleteMessageForEveryone');
    assert.ok(code.includes('export async function deleteMessageForMe'), 'Must export deleteMessageForMe');
    assert.ok(code.includes('export async function deleteMessage('), 'Must export deleteMessage alias');
    assert.ok(code.includes('export async function editMessage('), 'Must export editMessage');
});
