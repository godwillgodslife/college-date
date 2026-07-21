const QUEUE_PREFIX = 'tcd-offline-queue:';

function queueKey(userId) {
  return `${QUEUE_PREFIX}${userId || 'anonymous'}`;
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function getOfflineQueue(userId) {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(queueKey(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveOfflineQueue(userId, queue) {
  if (!canUseStorage()) return;

  try {
    const compactQueue = queue
      .filter(Boolean)
      .slice(-200);
    window.localStorage.setItem(queueKey(userId), JSON.stringify(compactQueue));
  } catch (error) {
    console.warn('[OfflineQueue] Save skipped:', error);
  }
}

export function enqueueOfflineOperation(userId, operation) {
  const queue = getOfflineQueue(userId);
  const id = operation?.id || `${operation?.type || 'op'}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
  const existingIndex = queue.findIndex((item) => item.id === id);
  const nextOperation = {
    ...operation,
    id,
    attempts: operation?.attempts || 0,
    createdAt: operation?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const nextQueue = existingIndex >= 0
    ? queue.map((item, index) => index === existingIndex ? { ...item, ...nextOperation } : item)
    : [...queue, nextOperation];

  saveOfflineQueue(userId, nextQueue);
  return nextOperation;
}

export function removeOfflineOperation(userId, operationId) {
  saveOfflineQueue(userId, getOfflineQueue(userId).filter((item) => item.id !== operationId));
}

export function clearOfflineQueue(userId) {
  if (!canUseStorage()) return;
  try {
    if (userId) {
      window.localStorage.removeItem(queueKey(userId));
      return;
    }

    Object.keys(window.localStorage)
      .filter((key) => key.startsWith(QUEUE_PREFIX))
      .forEach((key) => window.localStorage.removeItem(key));
  } catch (error) {
    console.warn('[OfflineQueue] Clear skipped:', error);
  }
}

export function getQueuedOperations(userId, type) {
  const queue = getOfflineQueue(userId);
  return type ? queue.filter((operation) => operation.type === type) : queue;
}

export async function drainOfflineQueue(userId, handlers = {}, { maxBatch = 10 } = {}) {
  if (!userId || typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { processed: 0, failed: 0, remaining: getOfflineQueue(userId).length };
  }

  const queue = getOfflineQueue(userId);
  let processed = 0;
  let failed = 0;
  let nextQueue = [...queue];

  for (const operation of queue.slice(0, maxBatch)) {
    const handler = handlers[operation.type];
    if (!handler) continue;

    try {
      await handler(operation);
      nextQueue = nextQueue.filter((item) => item.id !== operation.id);
      processed += 1;
    } catch (error) {
      failed += 1;
      nextQueue = nextQueue.map((item) => item.id === operation.id
        ? {
            ...item,
            attempts: (item.attempts || 0) + 1,
            updatedAt: new Date().toISOString(),
            lastError: error?.message || String(error),
          }
        : item
      );
    }
  }

  saveOfflineQueue(userId, nextQueue);
  return { processed, failed, remaining: nextQueue.length };
}
