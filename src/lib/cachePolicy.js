export const CACHE_TTL = {
  authProfile: 30 * 60 * 1000,
  wallet: 2 * 60 * 1000,
  discovery: 10 * 60 * 1000,
  confessions: 15 * 60 * 1000,
  conversations: 24 * 60 * 60 * 1000,
  messages: 90 * 24 * 60 * 60 * 1000,
  notifications: 14 * 24 * 60 * 60 * 1000,
  requests: 10 * 60 * 1000,
  viewers: 15 * 60 * 1000,
  dashboard: 5 * 60 * 1000,
  statuses: 5 * 60 * 1000,
  settings: 30 * 24 * 60 * 60 * 1000,
};

export const CACHE_LIMITS = {
  discoveryProfiles: 60,
  conversations: 100,
  messagesPerConversation: 300,
  notifications: 100,
  requests: 80,
  viewers: 80,
  statuses: 80,
};

export function trimCacheList(value, maxItems) {
  if (!Array.isArray(value) || !Number.isFinite(maxItems)) return value;
  return value.slice(Math.max(0, value.length - maxItems));
}
