/**
 * localStatusService.js
 * Ephemeral client-side status & story system for The College Date.
 * 
 * 100% Zero-Backend Storage:
 * Stored entirely in browser IndexedDB (allowing 50MB+ video caching with 0 bytes on Supabase).
 * Automatically expires after 24 hours.
 * Enforces maximum 2 statuses per day.
 * Rewards video uploads with +10 CD Coins campus incentive.
 */

const DB_NAME = 'college_date_status_store';
const DB_VERSION = 1;
const STORE_NAME = 'ephemeral_statuses';
const MAX_DAILY_STATUSES = 2;

function openDB() {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !window.indexedDB) {
            reject(new Error('IndexedDB not supported in this environment'));
            return;
        }

        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('user_id', 'user_id', { unique: false });
                store.createIndex('expires_at', 'expires_at', { unique: false });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Get date key for today (YYYY-MM-DD)
 */
function getTodayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Check daily upload count for user
 */
export function getDailyStatusCount(userId) {
    if (!userId) return { count: 0, max: MAX_DAILY_STATUSES, canUpload: true };
    try {
        const todayKey = getTodayKey();
        const stored = localStorage.getItem(`cd_daily_status_${userId}_${todayKey}`);
        const count = stored ? parseInt(stored, 10) : 0;
        return {
            count,
            max: MAX_DAILY_STATUSES,
            remaining: Math.max(0, MAX_DAILY_STATUSES - count),
            canUpload: count < MAX_DAILY_STATUSES
        };
    } catch {
        return { count: 0, max: MAX_DAILY_STATUSES, remaining: MAX_DAILY_STATUSES, canUpload: true };
    }
}

/**
 * Increment daily upload count for user
 */
function incrementDailyStatusCount(userId) {
    if (!userId) return;
    try {
        const todayKey = getTodayKey();
        const key = `cd_daily_status_${userId}_${todayKey}`;
        const current = parseInt(localStorage.getItem(key) || '0', 10);
        localStorage.setItem(key, String(current + 1));
    } catch (e) {
        console.warn('[LocalStatus] Error saving daily count:', e);
    }
}

/**
 * Award video incentive (+10 CD Coins) in local storage
 */
export function awardVideoIncentive(userId) {
    if (!userId) return 0;
    try {
        const key = `cd_coins_bonus_${userId}`;
        const current = parseInt(localStorage.getItem(key) || '0', 10);
        const updated = current + 10;
        localStorage.setItem(key, String(updated));
        // Dispatch local event so header coin counters update immediately
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('cd:coins-updated', { detail: { bonus: 10, total: updated } }));
        }
        return 10;
    } catch {
        return 0;
    }
}

/**
 * Save a new local status
 * @param {string} userId - Current user ID
 * @param {File|Blob} file - Video or Image file
 * @param {string} caption - Optional text caption
 * @param {object} userProfile - Profile snippet for display
 */
export async function saveLocalStatus(userId, file, caption = '', userProfile = null) {
    if (!userId || !file) {
        throw new Error('User ID and media file are required');
    }

    const { canUpload, count } = getDailyStatusCount(userId);
    if (!canUpload) {
        throw new Error(`Daily status limit reached (${count}/${MAX_DAILY_STATUSES}). Resets at midnight!`);
    }

    const isVideo = file.type?.startsWith('video/') || file.name?.match(/\.(mp4|mov|webm|m4v)$/i);
    const mediaType = isVideo ? 'video' : 'image';

    // Convert file to blob and generate object URL
    const blob = file instanceof Blob ? file : new Blob([file], { type: file.type });
    const localBlobUrl = URL.createObjectURL(blob);

    const now = Date.now();
    const expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours
    const statusId = `status_${now}_${Math.random().toString(36).slice(2, 8)}`;

    const statusRecord = {
        id: statusId,
        user_id: userId,
        media_url: localBlobUrl,
        blob,
        media_type: mediaType,
        caption: (caption || '').trim(),
        created_at: new Date(now).toISOString(),
        expires_at: new Date(expiresAt).toISOString(),
        user_profile: {
            id: userId,
            full_name: userProfile?.full_name || 'Campus Student',
            avatar_url: userProfile?.avatar_url || null,
            university: userProfile?.university || null
        },
        views: 0
    };

    const db = await openDB();
    await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.add(statusRecord);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });

    incrementDailyStatusCount(userId);

    let coinBonus = 0;
    if (isVideo) {
        coinBonus = awardVideoIncentive(userId);
    }

    // Trigger local status event for listeners
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cd:status-created', { detail: statusRecord }));
    }

    return {
        status: statusRecord,
        isVideo,
        coinBonus,
        remainingToday: MAX_DAILY_STATUSES - (count + 1)
    };
}

/**
 * Get active non-expired statuses for a specific user
 */
export async function getLocalUserStatuses(userId) {
    if (!userId) return [];
    try {
        const db = await openDB();
        const nowIso = new Date().toISOString();

        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const index = store.index('user_id');
            const req = index.getAll(userId);

            req.onsuccess = () => {
                const results = (req.result || [])
                    .filter(s => s.expires_at > nowIso)
                    .map(s => {
                        // Refresh ObjectURL if revoked or reconstructed from blob
                        let mediaUrl = s.media_url;
                        if (s.blob && (!mediaUrl || mediaUrl.startsWith('blob:'))) {
                            try {
                                mediaUrl = URL.createObjectURL(s.blob);
                            } catch {
                                mediaUrl = s.media_url;
                            }
                        }
                        return { ...s, media_url: mediaUrl };
                    })
                    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                resolve(results);
            };
            req.onerror = () => reject(req.error);
        });
    } catch (e) {
        console.warn('[LocalStatus] Error loading user statuses:', e);
        return [];
    }
}

/**
 * Get all active statuses from any campus users stored locally
 */
export async function getAllLocalStatuses() {
    try {
        const db = await openDB();
        const nowIso = new Date().toISOString();

        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.getAll();

            req.onsuccess = () => {
                const results = (req.result || [])
                    .filter(s => s.expires_at > nowIso)
                    .map(s => {
                        let mediaUrl = s.media_url;
                        if (s.blob) {
                            try {
                                mediaUrl = URL.createObjectURL(s.blob);
                            } catch {
                                mediaUrl = s.media_url;
                            }
                        }
                        return { ...s, media_url: mediaUrl };
                    });
                resolve(results);
            };
            req.onerror = () => reject(req.error);
        });
    } catch {
        return [];
    }
}

/**
 * Purge expired statuses from IndexedDB to maintain zero clutter
 */
export async function purgeExpiredStatuses() {
    try {
        const db = await openDB();
        const nowIso = new Date().toISOString();

        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();

        req.onsuccess = () => {
            const items = req.result || [];
            items.forEach(item => {
                if (item.expires_at <= nowIso) {
                    store.delete(item.id);
                }
            });
        };
    } catch (e) {
        console.warn('[LocalStatus] Error during cleanup:', e);
    }
}
