import { useEffect, useRef } from 'react';
import { sendMessage } from '../services/chatService';
import { markAllNotificationsAsRead, markNotificationAsRead, updateUserSettings } from '../services/notificationService';
import { saveGenderPreference } from '../services/profileService';
import { recordSwipe } from '../services/swipeService';
import { drainOfflineQueue, getOfflineQueue } from '../lib/offlineQueue';

function isOnline() {
  return typeof navigator === 'undefined' || navigator.onLine !== false;
}

async function replaySendMessage(operation) {
  const payload = operation.payload || {};
  const { data, error } = await sendMessage(
    payload.matchId,
    payload.senderId,
    payload.content,
    payload.type || 'text',
    {
      ...(payload.metadata || {}),
      client_nonce: payload.clientNonce || payload.metadata?.client_nonce
    }
  );

  if (error || !data) throw new Error(error?.message || error || 'Message sync failed');
}

async function replaySwipe(operation) {
  const payload = operation.payload || {};
  const result = await recordSwipe(
    payload.swiperId,
    payload.swipedId,
    payload.direction,
    payload.swipeType || 'standard',
    payload.messageTeaser || null,
    {
      isPremium: payload.isPremium === true,
      offlineReplay: true,
      clientOperationId: payload.clientOperationId || operation.id,
      requireIdempotentPayment: payload.direction === 'right' && payload.isPremium !== true
    }
  );

  if (result?.error) throw new Error(result.error);
}

const OFFLINE_SYNC_HANDLERS = {
  send_message: replaySendMessage,
  record_swipe: replaySwipe,
  mark_notification_read: (operation) => markNotificationAsRead(operation.payload?.notificationId)
    .then((result) => {
      if (result?.error) throw new Error(result.error);
    }),
  mark_all_notifications_read: (operation) => markAllNotificationsAsRead(operation.payload?.userId)
    .then((result) => {
      if (result?.error) throw new Error(result.error);
    }),
  update_user_settings: (operation) => updateUserSettings(operation.payload?.userId, operation.payload?.changes || {})
    .then((result) => {
      if (result?.error) throw new Error(result.error);
    }),
  save_gender_preference: (operation) => saveGenderPreference(operation.payload?.userId, operation.payload?.gender)
    .then((result) => {
      if (result?.error) throw new Error(result.error);
    })
};

export function useOfflineSync(userId) {
  const syncingRef = useRef(false);

  useEffect(() => {
    if (!userId) return undefined;

    let cancelled = false;
    let timerId;

    const sync = async () => {
      if (cancelled || syncingRef.current || !isOnline()) return;
      if (getOfflineQueue(userId).length === 0) return;

      syncingRef.current = true;
      try {
        const result = await drainOfflineQueue(userId, OFFLINE_SYNC_HANDLERS, { maxBatch: 20 });
        if (result.processed > 0 && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tcd:offline-sync-complete', { detail: result }));
        }
      } finally {
        syncingRef.current = false;
      }
    };

    const scheduleSync = () => {
      window.clearTimeout(timerId);
      timerId = window.setTimeout(sync, 1000);
    };

    scheduleSync();
    window.addEventListener('online', scheduleSync);
    window.addEventListener('visibilitychange', scheduleSync);

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
      window.removeEventListener('online', scheduleSync);
      window.removeEventListener('visibilitychange', scheduleSync);
    };
  }, [userId]);
}
