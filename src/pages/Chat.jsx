import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { formatSidebarTimestamp, formatChatTimestamp } from '../utils/formatTimestamp';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import {
    getMessages,
    sendMessage,
    subscribeToMessages,
    setupPresence,
    updateTypingStatus,
    markMessageAsRead,
    markConversationRead,
    uploadVoiceNote,
    uploadChatImage,
    uploadChatVideo,
    uploadChatDocument,
    openViewOnceMedia,
    getSignedChatMediaUrl,
    updateDisappearingMessages,
    addReaction,
    editMessage,
    deleteMessage,
    deleteMessageForEveryone,
    deleteMessageForMe,
    getMessageInfo,
    initiateCallSignal,
    respondCallSignal,
    createClientNonce,
    toValidUuidNonce,
} from '../services/chatService';
import { compressImage, generateBlurPlaceholder } from '../utils/imageCompressor';
import { getAvatarUrl, registerProfilePhotoTimestamp } from '../utils/profileData';
import { getWallet } from '../services/paymentService';
import { sendGift } from '../services/giftService';
import { requestAiAssistant } from '../services/aiAssistantService';
import { blockUser, unblockUser, getBlockedUsers } from '../services/blockService';
import { submitUserReport } from '../services/reportService';
import { getCoinBalance, sendCoinGift, VIRTUAL_GIFTS } from '../services/coinService';
import { updateLiveLocation, startWatchingPosition, stopLiveLocation } from '../services/locationService';
import { recordQuestProgress } from '../services/campusQuestService';
import { canSendLiveLocation } from '../services/entitlementService';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { recordPolicyAcceptance } from '../services/policyService';
import VoiceRecorder from '../components/ChatVoiceRecorder';
import StickerDrawer from '../components/StickerDrawer';
import GiftStore from '../components/GiftStore';
import MessageActionMenu from '../components/MessageActionMenu';
import MessageDeleteModal from '../components/MessageDeleteModal';
import MessageInfoModal from '../components/MessageInfoModal';
import AudioMessage from '../components/AudioMessage';
import ViewOnceViewerModal from '../components/ViewOnceViewerModal';
import ReportModal from '../components/ReportModal';
import RequestsDiscoveryHighlight from '../components/RequestsDiscoveryHighlight';
import {
    isEligibleForRequestsDiscovery,
    getRequestsDiscoveryCopy,
    markRequestsDiscovered,
    markDiscoveryShownInSession,
    wasShownInSession
} from '../utils/requestsDiscovery';
import { recordFeedImpression } from '../services/feedImpressionService';
import CoinStoreModal from '../components/CoinStoreModal';
import CreateServiceDealModal from '../components/CreateServiceDealModal';
import ServiceDealCard from '../components/ServiceDealCard';
import ChatMiniGameModal from '../components/ChatMiniGameModal';
import ChatMiniGameCard from '../components/ChatMiniGameCard';
import LiveLocationCard from '../components/LiveLocationCard';
import { ContextualTip, AppGuideModal, markFeatureUsed } from '../components/ContextualGuide';
import { recordStreakActivity } from '../services/scoreStreakService';
import { evaluateDailyQualification } from '../services/activeProgramService';
import OfficialChannelCard from '../components/OfficialChannelCard';
import OfficialHubModal from '../components/OfficialHubModal';
import ChatActionModal from '../components/ChatActionModal';
import StatusChoiceModal from '../components/StatusChoiceModal';
import StatusViewer from '../components/StatusViewer';
import { getLocalUserStatuses, getAllLocalStatuses } from '../services/localStatusService';
import { getActiveUserStatuses, getRecentStatuses, getViewedStatusIds } from '../services/statusService';
import { triggerLightHaptic } from '../utils/haptics';
import {
    getCampusCommonGround as computeCampusCommonGround,
    getCampusIcebreakers as computeCampusIcebreakers
} from '../utils/campusCommonGround';
import OffPlatformBlockedModal from '../components/OffPlatformBlockedModal';
import {
    detectOffPlatformContact,
    detectOffPlatformContactWithHistory,
    isOffPlatformBlockError,
    recordOffPlatformAttempt,
    canBypassOffPlatformSafeguard
} from '../utils/offPlatformGuard';
import { isEliteUltra } from '../utils/premium';
import './Chat.css';

function getCampusCommonGround(otherUser, userProfile) {
    return computeCampusCommonGround(otherUser, userProfile);
}

function getCampusIcebreakers(otherUser, userProfile) {
    return computeCampusIcebreakers(otherUser, userProfile);
}

const CAMPUS_AI_FALLBACKS = [
    "Hey! How's your semester going so far? 📚",
    "Hey! What's your favourite chill spot on campus? ☕",
    "Saw your profile and had to say hi! What are you studying? ✨",
    "Library crunch or hostel chilling today? 😂",
    "Hope lectures aren't stressing you too much! 🎓"
];


const DISAPPEARING_OPTIONS = [
    { label: 'Off', seconds: 0 },
    { label: '24 hours', seconds: 24 * 60 * 60 },
    { label: '7 days', seconds: 7 * 24 * 60 * 60 },
    { label: '30 days', seconds: 30 * 24 * 60 * 60 },
];

function messageCacheKey(userId, matchId) {
    return userId && matchId ? ['messages', userId, matchId] : null;
}

function queuedMessageToBubble(operation) {
    const payload = operation?.payload || {};
    if (!payload.matchId || !payload.senderId) return null;

    return {
        id: payload.optimisticId || operation.id,
        match_id: payload.matchId,
        sender_id: payload.senderId,
        content: payload.content,
        type: payload.type || 'text',
        metadata: payload.metadata || {},
        created_at: payload.createdAt || operation.createdAt || new Date().toISOString(),
        is_read: false,
        _pending: true,
        _queued: true,
        _failed: Boolean(operation.lastError),
    };
}

import { useConversations } from '../hooks/useSWRData';
import { Virtuoso } from 'react-virtuoso';
import OptimizedImage from '../components/OptimizedImage';
import { playSendSwoosh, playNotificationDing } from '../lib/audioContext';
import { CACHE_LIMITS, CACHE_TTL, trimCacheList } from '../lib/cachePolicy';
import { getCachedData, setCachedData } from '../lib/persistentCache';
import { cacheMediaSource, getCachedMediaObjectUrl } from '../lib/mediaCache';
import { hasActivePremium } from '../utils/premium';
import {
    drainOfflineQueue,
    enqueueOfflineOperation,
    getQueuedOperations,
    removeOfflineOperation
} from '../lib/offlineQueue';


// ── Tick Read-Receipt Icons ────────────────────────────────────────────
function ReadReceipt({ msg, isSender, onRetry }) {
    if (!isSender) return null;
    if (msg._failed) {
        return (
            <span
                className="read-receipt failed"
                title="Failed to send. Tap to retry."
                onClick={(e) => {
                    e.stopPropagation();
                    if (onRetry) onRetry(msg);
                }}
                role="button"
                tabIndex={0}
            >
                ⚠️ Tap to retry
            </span>
        );
    }
    if (msg._pending) {
        return <span className="read-receipt pending" title="Sending">⏳</span>;
    }
    if (msg.is_read) {
        return (
            <span className="read-receipt blue" title="Read">
                <svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M12.122 18.232l-5.657-5.657-1.414 1.414 7.071 7.071 11.314-11.314-1.414-1.414zm0-2.828L19.192 8.334l-1.414-1.414-7.07 7.071-3.536-3.535-1.414 1.414z" /></svg>
            </span>
        );
    }
    return (
        <span className="read-receipt gray" title="Sent">
            <svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M9.707 18.707l-5.657-5.657 1.414-1.414 4.243 4.243 9.899-9.899 1.414 1.414z" /></svg>
        </span>
    );
}

function ChatMedia({ msg, type, isSent }) {
    const [mediaUrl, setMediaUrl] = useState(() => {
        if (!msg.content || !/^https?:\/\//i.test(msg.content) && !msg.content.startsWith('blob:')) return null;
        return msg.content;
    });
    const [loadError, setLoadError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        let objectUrl = null;
        const source = msg.metadata?.storage_path || msg.content;
        if (!source) return undefined;

        if (/^https?:\/\//i.test(source) || source.startsWith('blob:')) {
            cacheMediaSource(source).catch(() => {});
            return undefined;
        }

        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            getCachedMediaObjectUrl(source).then((cachedUrl) => {
                if (cancelled) return;
                if (cachedUrl) {
                    objectUrl = cachedUrl;
                    setMediaUrl(cachedUrl);
                } else {
                    setLoadError('Media unavailable offline');
                }
            });
            return () => {
                cancelled = true;
                if (objectUrl) window.URL.revokeObjectURL(objectUrl);
            };
        }

        getSignedChatMediaUrl(source).then(async ({ url, error }) => {
            if (cancelled) return;
            if (error || !url) {
                const cachedUrl = await getCachedMediaObjectUrl(source);
                if (!cancelled && cachedUrl) {
                    objectUrl = cachedUrl;
                    setMediaUrl(cachedUrl);
                    return;
                }
                setLoadError(error || 'Could not load media');
                return;
            }
            cacheMediaSource(url, { cacheKey: source }).catch(() => {});
            setMediaUrl(url);
        });

        return () => {
            cancelled = true;
            if (objectUrl) window.URL.revokeObjectURL(objectUrl);
        };
    }, [msg.content, msg.metadata?.storage_path]);

    if (loadError) {
        return <div className="chat-media-error">Media unavailable</div>;
    }

    if (!mediaUrl) {
        return <div className="chat-media-loading">Loading media...</div>;
    }

    if (type === 'voice') {
        return <AudioMessage src={mediaUrl} isSent={isSent} />;
    }

    if (type === 'video') {
        return (
            <div className="video-message">
                <video
                    src={mediaUrl}
                    controls
                    playsInline
                    preload="metadata"
                    className="chat-video-player"
                />
            </div>
        );
    }

    return (
        <div className="image-message">
            <OptimizedImage
                src={mediaUrl}
                placeholder={msg.metadata?.placeholder}
                alt="Chat media"
                width={250}
            />
        </div>
    );
}

export default function Chat() {
    const { currentUser, userProfile } = useAuth();
    const { addToast } = useToast();
    const { markConversationNotificationsRead, triggerGiftCelebration } = useNotifications() || {};
    const navigate = useNavigate();
    const location = useLocation();


    const [selectedConv, setSelectedConv] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [guideModalOpen, setGuideModalOpen] = useState(false);
    const [officialHubOpen, setOfficialHubOpen] = useState(false);
    const [sending, setSending] = useState(false);
    const [presence, setPresence] = useState({});
    const otherUserId = selectedConv?.other_user?.id;
    const opponentPresences = presence[otherUserId] || [];
    const isOtherOnline = opponentPresences.length > 0;
    const isOtherTyping = opponentPresences.some(p => p.is_typing);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const loadingMoreRef = useRef(false);
    const activeConvIdRef = useRef(null);
    const [isVoiceRecording, setIsVoiceRecording] = useState(false);

    // SWR for Conversations Sidebar via custom hook
    const { data: conversations = [], isLoading: convsLoading, mutate: revalidateConvs } = useConversations(currentUser?.id);

    useEffect(() => {
        if (Array.isArray(conversations)) {
            const unreadConvs = conversations.filter(c => c.has_unread).length;
            window.dispatchEvent(new CustomEvent('tcd:conversations-unread-updated', {
                detail: { count: unreadConvs }
            }));
        }
    }, [conversations]);

    const [callChoiceOpen, setCallChoiceOpen] = useState(false);
    const typingTimeoutRef = useRef(null);
    const presenceChannelRef = useRef(null);
    const isTypingRef = useRef(false);
    const chatInputRef = useRef(null);
    const isComposingRef = useRef(false);
    const sidebarRef = useRef(null);
    const sidebarScrollPos = useRef(0);

    const adjustInputHeight = useCallback(() => {
        if (!chatInputRef.current) return;
        chatInputRef.current.style.height = 'auto';
        const newHeight = Math.min(Math.max(chatInputRef.current.scrollHeight, 38), 120);
        chatInputRef.current.style.height = `${newHeight}px`;
    }, []);

    useEffect(() => {
        adjustInputHeight();
    }, [newMessage, adjustInputHeight]);


    const [showStickers, setShowStickers] = useState(false);

    const [showGifts, setShowGifts] = useState(false);
    const [walletBalance, setWalletBalance] = useState(0);
    const [, setTick] = useState(0);
    const [aiReplies, setAiReplies] = useState([]);
    const [aiReplyLoading, setAiReplyLoading] = useState(false);
    const [chatMenuOpen, setChatMenuOpen] = useState(false);
    const [disappearingSaving, setDisappearingSaving] = useState(false);

    // Filter and search states
    const [searchQuery, setSearchQuery] = useState('');
    const [filterTab, setFilterTab] = useState('All');
    // Hydrate initial activity counts from persistent cache for instant offline rendering
    const cachedRequests = currentUser?.id
        ? getCachedData(['requests', currentUser.id], { ttlMs: CACHE_TTL.requests, allowStale: true })
        : null;
    const cachedViewers = currentUser?.id
        ? getCachedData(['viewers', currentUser.id], { ttlMs: CACHE_TTL.viewers, allowStale: true })
        : null;

    const [likesCount, setLikesCount] = useState(() => cachedRequests?.summary?.total_count || cachedRequests?.total_count || 0);
    const [viewsCount, setViewsCount] = useState(() => cachedViewers?.summary?.total_count || cachedViewers?.total_count || 0);
    const [pendingRequestsList, setPendingRequestsList] = useState(() => {
        if (userProfile?.is_premium && cachedRequests?.items) {
            return cachedRequests.items;
        }
        return [];
    });

    // Educational Connection-Request Discovery state for new students
    const wasShownPriorInSessionRef = useRef(null);
    if (wasShownPriorInSessionRef.current === null && currentUser?.id) {
        wasShownPriorInSessionRef.current = wasShownInSession(currentUser.id);
    }

    const isRequestsDiscoveryEligible = isEligibleForRequestsDiscovery({
        userProfile,
        conversationsCount: conversations.length,
        userId: currentUser?.id,
        hasRequests: likesCount > 0,
        alreadyShownInSession: wasShownPriorInSessionRef.current === true
    });

    const discoveryCopy = getRequestsDiscoveryCopy(likesCount);

    // Record educational impression without self-suppression during the active visit
    useEffect(() => {
        if (isRequestsDiscoveryEligible && currentUser?.id) {
            recordFeedImpression('discovery_highlight', 'chat_requests_entry', 'chat', {
                engaged: false
            }).catch(() => {});
            return () => {
                markDiscoveryShownInSession(currentUser.id);
            };
        }
    }, [isRequestsDiscoveryEligible, currentUser?.id]);

    const handleRequestsEntryClick = () => {
        if (currentUser?.id) {
            markRequestsDiscovered(currentUser.id);
            recordFeedImpression('discovery_highlight', 'chat_requests_entry', 'chat', {
                engaged: true
            }).catch(() => {});
        }
        navigate('/requests');
    };

    // Message Action & Gesture states
    const [activeActionMessage, setActiveActionMessage] = useState(null);
    const [actionMenuPosition, setActionMenuPosition] = useState(null);
    const [reactionBar, setReactionBar] = useState(null);
    const [deleteTargetMessage, setDeleteTargetMessage] = useState(null);
    const [infoTargetMessage, setInfoTargetMessage] = useState(null);
    const [highlightedMessageId, setHighlightedMessageId] = useState(null);

    // Swipe left to reply states
    const [swipingMsgId, setSwipingMsgId] = useState(null);
    const [swipeOffset, setSwipeOffset] = useState(0);
    const hasVibratedRef = useRef(false);
    const virtuosoRef = useRef(null);
    const longPressTimer = useRef(null);
    const touchStartRef = useRef({ x: 0, y: 0, time: 0 });

    // Conversation list row swipe & contextual bottom sheet states
    const [contextConv, setContextConv] = useState(null);
    const [swipedConvId, setSwipedConvId] = useState(null);
    const [swipedOffset, setSwipedOffset] = useState(0);
    const draftsByConvRef = useRef({});
    const convTouchStartRef = useRef({ x: 0, y: 0, time: 0, id: null, isScrolling: false });
    const convLongPressTimerRef = useRef(null);
    const [mutedConvs, setMutedConvs] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('tcd_muted_convs') || '[]');
        } catch {
            return [];
        }
    });

    // Ephemeral Status Choice & Viewer states
    const [statusChoiceTarget, setStatusChoiceTarget] = useState(null);
    const [activeViewingStatus, setActiveViewingStatus] = useState(null);
    const [usersWithStatus, setUsersWithStatus] = useState(() => new Set());
    const [usersWithUnviewedStatus, setUsersWithUnviewedStatus] = useState(() => new Set());

    useEffect(() => {
        let isCancelled = false;

        const refreshStatuses = () => {
            Promise.all([
                getRecentStatuses().catch(() => ({ data: [] })),
                getAllLocalStatuses().catch(() => [])
            ]).then(([remoteRes, localList]) => {
                if (isCancelled) return;
                const allStatuses = [...(remoteRes?.data || []), ...(localList || [])];
                const userIds = new Set();
                const unviewedUserIds = new Set();
                const viewedIds = getViewedStatusIds(currentUser?.id);

                allStatuses.forEach(s => {
                    if (!s?.user_id) return;
                    userIds.add(s.user_id);
                    const statusKey = s.id || s.media_url;
                    if (s.user_id !== currentUser?.id && !viewedIds.has(statusKey)) {
                        unviewedUserIds.add(s.user_id);
                    }
                });

                setUsersWithStatus(userIds);
                setUsersWithUnviewedStatus(unviewedUserIds);
            }).catch(() => {});
        };

        refreshStatuses();

        const handleStatusCreated = (e) => {
            if (e.detail?.user_id) {
                setUsersWithStatus(prev => new Set([...prev, e.detail.user_id]));
            }
            refreshStatuses();
        };

        const handleStatusViewed = () => {
            refreshStatuses();
        };

        window.addEventListener('cd:status-created', handleStatusCreated);
        window.addEventListener('cd:status-viewed', handleStatusViewed);

        return () => {
            isCancelled = true;
            window.removeEventListener('cd:status-created', handleStatusCreated);
            window.removeEventListener('cd:status-viewed', handleStatusViewed);
        };
    }, [currentUser?.id]);

    const handleAvatarClick = useCallback(async (user, e, convId = null) => {
        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
        if (!user?.id) return;

        const targetConvId = convId || (selectedConv?.other_user?.id === user.id ? selectedConv?.id : null);

        try {
            const statuses = await getActiveUserStatuses(user.id);
            if (statuses && statuses.length > 0) {
                setStatusChoiceTarget({ user, statuses, conversationId: targetConvId });
                return;
            }
        } catch (err) {
            console.warn('[Chat] Error checking active user statuses:', err);
        }

        navigate(`/profile/${user.id}`, {
            state: {
                conversationId: targetConvId,
                matchId: targetConvId,
                fromChat: true,
                partnerProfile: user
            }
        });
    }, [navigate, selectedConv]);

    const scrollToBottomSmooth = useCallback(() => {
        if (virtuosoRef.current && messages.length > 0) {
            virtuosoRef.current.scrollToIndex({
                index: messages.length - 1,
                align: 'end',
                behavior: 'smooth'
            });
        }
    }, [messages.length]);

    useEffect(() => {
        const handleKeyboardShow = () => {
            setTimeout(scrollToBottomSmooth, 150);
        };
        window.addEventListener('tcd:keyboard-show', handleKeyboardShow);
        return () => window.removeEventListener('tcd:keyboard-show', handleKeyboardShow);
    }, [scrollToBottomSmooth]);

    const [pendingSelection, setPendingSelection] = useState(null);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [isOffline, setIsOffline] = useState(() => typeof navigator !== 'undefined' && navigator.onLine === false);

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const [replyToMessage, setReplyToMessage] = useState(null);
    const [editingMessage, setEditingMessage] = useState(null);
    const [showMoreActions, setShowMoreActions] = useState(false);
    const [offPlatformViolation, setOffPlatformViolation] = useState(null);
    const [offPlatformAttempts, setOffPlatformAttempts] = useState(1);

    const isUltra = useMemo(() => isEliteUltra(userProfile), [userProfile]);

    const offPlatformTypingCheck = useMemo(() => {
        if (isUltra || !newMessage || newMessage.trim().length < 4) return { blocked: false };
        return detectOffPlatformContact(newMessage);
    }, [isUltra, newMessage]);

    const [safetyNoticeDismissed, setSafetyNoticeDismissed] = useState(() => {
        try {
            return sessionStorage.getItem('cd_chat_safety_dismissed') === 'true';
        } catch (_) {
            return false;
        }
    });

    const dismissSafetyNotice = useCallback(() => {
        setSafetyNoticeDismissed(true);
        try {
            sessionStorage.setItem('cd_chat_safety_dismissed', 'true');
        } catch (_) {}
    }, []);

    const showOffPlatformBlock = useCallback((violation) => {
        triggerLightHaptic();
        const attempts = recordOffPlatformAttempt(currentUser?.id);
        setOffPlatformAttempts(attempts);
        setOffPlatformViolation(violation || { blocked: true, category: 'off_app' });
    }, [currentUser?.id]);

    // Sprint Features States
    const [coinBalance, setCoinBalance] = useState(0);
    const [showCoinStore, setShowCoinStore] = useState(false);
    const [isBlockedByMe, setIsBlockedByMe] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [showDealModal, setShowDealModal] = useState(false);
    const [showMiniGameModal, setShowMiniGameModal] = useState(false);
    const [viewOnceViewerData, setViewOnceViewerData] = useState(null);
    const [pendingMediaUpload, setPendingMediaUpload] = useState(null);
    const [showLocationPicker, setShowLocationPicker] = useState(false);
    const locationWatchCleanupRef = useRef(null);

    // Fetch Coin Balance
    const loadCoinBalance = useCallback(async () => {
        if (!currentUser) return;
        try {
            const { coins } = await getCoinBalance(currentUser.id);
            setCoinBalance(coins || 0);
        } catch (err) {
            console.error('Error fetching coins:', err);
        }
    }, [currentUser]);

    useEffect(() => {
        loadCoinBalance();
    }, [loadCoinBalance]);

    // Fetch Activity Counts (Admirers/Requests and Profile Views)
    const loadActivityCounts = useCallback(async () => {
        if (!currentUser?.id) return;
        try {
            const [admirersResult, viewersResult] = await Promise.all([
                supabase.rpc('get_admirers_secure', { p_limit: 10 }),
                supabase.rpc('get_profile_viewers_secure', { p_limit: 1 })
            ]);

            if (admirersResult.data?.success) {
                const total = admirersResult.data.total_count || 0;
                const admirerItems = Array.isArray(admirersResult.data.items)
                    ? admirersResult.data.items
                    : (Array.isArray(admirersResult.data.requests) ? admirersResult.data.requests : []);
                const isPremiumAdmirer = admirersResult.data.premium === true || admirersResult.data.is_premium === true;
                setLikesCount(total);
                if (userProfile?.is_premium || isPremiumAdmirer) {
                    setPendingRequestsList(admirerItems);
                }
                setCachedData(['requests', currentUser.id], {
                    summary: {
                        total_count: total,
                        premium: isPremiumAdmirer,
                        free_accepts_remaining: admirersResult.data.free_accepts_remaining ?? 3
                    },
                    items: admirerItems
                }, {
                    userId: currentUser.id,
                    type: 'requests',
                    ttlMs: CACHE_TTL.requests
                });
            }

            if (viewersResult.data?.success) {
                const totalViews = viewersResult.data.total_count || 0;
                setViewsCount(totalViews);
                setCachedData(['viewers', currentUser.id], {
                    summary: {
                        total_count: totalViews
                    },
                    items: viewersResult.data.items || []
                }, {
                    userId: currentUser.id,
                    type: 'viewers',
                    ttlMs: CACHE_TTL.viewers
                });
            }
        } catch (err) {
            console.warn('[Chat] Could not load activity counts:', err?.message || err);
        }
    }, [currentUser?.id, userProfile?.is_premium]);

    useEffect(() => {
        loadActivityCounts();
    }, [loadActivityCounts]);

    // Realtime listener for incoming swipes to update likesCount dynamically
    useEffect(() => {
        if (!currentUser?.id) return;
        const channel = supabase
            .channel(`incoming_likes:${currentUser.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'swipes',
                filter: `swiped_id=eq.${currentUser.id}`
            }, () => {
                loadActivityCounts();
            })
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }, [currentUser?.id, loadActivityCounts]);

    // Check if other user is blocked
    useEffect(() => {
        if (!currentUser || !selectedConv?.other_user?.id) {
            setIsBlockedByMe(false);
            return;
        }
        let cancelled = false;
        const checkBlock = async () => {
            try {
                const targetOtherId = selectedConv?.other_user?.id;
                if (!targetOtherId || !currentUser?.id) return;
                const { data: blockedList } = await getBlockedUsers(currentUser.id);
                if (cancelled) return;
                const isBlocked = (blockedList || []).some(
                    b => b.blocked_id === targetOtherId || b.blocked_user?.id === targetOtherId
                );
                setIsBlockedByMe(isBlocked);
            } catch (err) {
                console.error('Error checking block status:', err);
            }
        };
        checkBlock();
        return () => { cancelled = true; };
    }, [currentUser, selectedConv?.other_user?.id]);

    // Clean up location watch on unmount or conv change
    useEffect(() => {
        return () => {
            if (locationWatchCleanupRef.current) {
                locationWatchCleanupRef.current();
                locationWatchCleanupRef.current = null;
            }
        };
    }, [selectedConv?.id]);

    // Periodic sweep for expired disappearing messages
    useEffect(() => {
        const interval = setInterval(() => {
            const nowIso = new Date().toISOString();
            setMessages(prev => {
                const filtered = prev.filter(m => !m.expires_at || m.expires_at > nowIso);
                return filtered.length !== prev.length ? filtered : prev;
            });
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    // Fetch Likes (Pending incoming swipes) and views count
    useEffect(() => {
        if (!currentUser) return;
        
        const fetchActivityCounts = async () => {
            try {
                const [admirersResult, viewersResult] = await Promise.all([
                    supabase.rpc('get_admirers_secure', { p_limit: 10 }),
                    supabase.rpc('get_profile_viewers_secure', { p_limit: 1 })
                ]);

                if (admirersResult.error) throw admirersResult.error;
                if (viewersResult.error) throw viewersResult.error;

                const newLikes = admirersResult.data?.total_count || 0;
                const admirerItems = Array.isArray(admirersResult.data?.items)
                    ? admirersResult.data.items
                    : (Array.isArray(admirersResult.data?.requests) ? admirersResult.data.requests : []);
                const isPremiumAdmirer = admirersResult.data?.premium === true || admirersResult.data?.is_premium === true;
                const newItems = (userProfile?.is_premium || isPremiumAdmirer) ? admirerItems : [];
                const newViews = viewersResult.data?.total_count || 0;

                setLikesCount(newLikes);
                setPendingRequestsList(newItems);
                setViewsCount(newViews);

                if (currentUser?.id && admirersResult.data) {
                    setCachedData(['requests', currentUser.id], {
                        items: admirerItems,
                        summary: {
                            total_count: newLikes,
                            premium: isPremiumAdmirer,
                            free_accepts_remaining: admirersResult.data.free_accepts_remaining
                        }
                    }, { userId: currentUser.id, type: 'requests' });
                }
                if (currentUser?.id && viewersResult.data) {
                    setCachedData(['viewers', currentUser.id], {
                        items: viewersResult.data.items || [],
                        summary: {
                            total_count: newViews,
                            premium: viewersResult.data.premium === true
                        }
                    }, { userId: currentUser.id, type: 'viewers' });
                }
            } catch (err) {
                console.error('Error fetching activity counts:', err);
            }
        };
        
        fetchActivityCounts();
    }, [currentUser]);

    const mergeMessageList = useCallback((prev, incoming) => {
        const nonce = incoming.metadata?.client_nonce;
        const existingIndex = prev.findIndex(msg => (
            msg.id === incoming.id ||
            (nonce && msg.metadata?.client_nonce === nonce)
        ));

        if (existingIndex >= 0) {
            return prev.map((msg, index) => {
                if (index !== existingIndex) return msg;
                const existingIsTemp = !msg.id || String(msg.id).startsWith('temp-');
                const incomingIsTemp = !incoming.id || String(incoming.id).startsWith('temp-');
                // Ensure a confirmed server UUID is NEVER clobbered by an incoming temporary ID
                const resolvedId = (!existingIsTemp && incomingIsTemp) ? msg.id : incoming.id;
                const isPending = String(resolvedId).startsWith('temp-') ? Boolean(incoming._pending) : false;
                return {
                    ...msg,
                    ...incoming,
                    id: resolvedId,
                    _pending: isPending
                };
            });
        }

        const next = [...prev, incoming];
        return next.length > 100 ? next.slice(-100) : next;
    }, []);

    // ── Initial Load ───────────────────────────────────────────────────
    useEffect(() => {
        if (currentUser) {
            loadWallet();
        }
    }, [currentUser]);

    // ── Midnight/Minute Sync: keeps timestamps fresh ──────────────────
    useEffect(() => {
        const interval = setInterval(() => setTick(t => t + 1), 60000);
        return () => clearInterval(interval);
    }, []);

    async function loadWallet() {
        const { data } = await getWallet(currentUser.id);
        if (data) setWalletBalance(data.available_balance);
    }

    // ── Deep-link check & Pending selection handler ────────────────────
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const chatId = params.get('chatId') || location.state?.chatId;
        const openChatWith = (location.state?.openChatWith && location.state.openChatWith !== 'undefined') 
            ? location.state.openChatWith 
            : location.state?.matchData?.id;

        // Filter out bad artifacts from URL params ("null", "undefined" as strings)
        const sanitize = (val) => (val && val !== 'undefined' && val !== 'null') ? val : null;
        const finalChatId = sanitize(chatId);
        const finalTargetId = sanitize(openChatWith);

        if (!finalChatId && !finalTargetId) {
            // Default selection for desktop: select first conversation if none selected
            if (!selectedConv && window.innerWidth > 768 && conversations.length > 0) {
                console.log('[Chat] Standard desktop auto-selection');
                setSelectedConv(conversations[0]);
            }
            return;
        }

        console.log('[Chat] Deep-link detect:', { chatId: finalChatId, openChatWith: finalTargetId });

        if (location.state?.initialMessage) {
            setNewMessage(location.state.initialMessage);
        }

        // First attempt: Check if target exists in current list
        const target = finalChatId 
            ? conversations.find(c => c?.id === finalChatId || c?.match_id === finalChatId)
            : conversations.find(c => (c?.other_user?.id || c?.other_user_id) === finalTargetId);

        if (target) {
            console.log('[Chat] Target found! Selecting:', target.id);
            setSelectedConv(target);
            setPendingSelection(null); 
        } else if (location.state?.matchData && location.state.matchData.full_name) {
            // Robust ID sanitization
            const syntheticId = (finalChatId && finalChatId !== 'null') ? finalChatId : null; 
            
            console.log('[Chat] Synthetic target state:', { finalChatId, syntheticId });

            if (!syntheticId) {
                console.log('[Chat] Match record not found yet. Using placeholder synthetic context.');
                setSelectedConv({
                    id: null,
                    other_user: location.state?.matchData || { full_name: 'Member' },
                    _isSynthetic: true,
                    _isPendingMatch: true
                });
            } else {
                console.log('[Chat] Using synthetic conversation with real match_id:', syntheticId);
                setSelectedConv({
                    id: syntheticId,
                    match_id: syntheticId,
                    _isSynthetic: true,
                    other_user: location.state?.matchData || { full_name: 'Member' },
                });
            }
            
            setPendingSelection({ chatId: finalChatId, openChatWith: finalTargetId });
            if (!convsLoading) revalidateConvs();
        } else {

            console.log('[Chat] Target NOT in list yet. Setting pending and requesting revalidation.');
            setPendingSelection({ chatId: finalChatId, openChatWith: finalTargetId });
            if (!convsLoading) {
                revalidateConvs();
            }
        }
    }, [location.search, location.state]); // Only run when navigation context changes

    // Resolver: Watch conversations for arrivals that match pending selections
    useEffect(() => {
        if (!pendingSelection || conversations.length === 0) return;

        console.log('[Chat] Evaluating pending selection against new conversations list...');
        const { chatId, openChatWith } = pendingSelection;
        
        const target = chatId 
            ? conversations.find(c => c?.id === chatId || c?.match_id === chatId)
            : conversations.find(c => (c?.other_user?.id || c?.other_user_id) === openChatWith);

        if (target) {
            console.log('[Chat] RESOLVED: Pending target found in updated list!', target.id);
            setSelectedConv(target);
            setPendingSelection(null);
        }
    }, [conversations, pendingSelection]);

    // ── Polling: Revalidate if pending selection exists ──────────
    useEffect(() => {
        let pollTimer;
        if (pendingSelection && !convsLoading) {
            pollTimer = setInterval(() => {
                console.log('[Chat] Pending selection active. Polling for real conversation...');
                revalidateConvs();
            }, 3000);
        }
        return () => clearInterval(pollTimer);
    }, [pendingSelection, convsLoading]);

    // ── Hide Navbar on Mobile during active chat ───────
    useEffect(() => {
        if (selectedConv) {
            document.body.classList.add('mobile-chat-active');
        } else {
            document.body.classList.remove('mobile-chat-active');
        }

        return () => {
            document.body.classList.remove('mobile-chat-active');
        };
    }, [selectedConv]);

    // ── Dedicated Back Navigation (Android hardware back & in-app back arrow) ──
    const handleCloseConversation = useCallback(() => {
        if (selectedConv?.id) {
            draftsByConvRef.current[selectedConv.id] = newMessage;
        }
        setNewMessage('');
        setSelectedConv(null);
        setPendingSelection(null);
        setCallChoiceOpen(false);
        setReactionBar(null);
        setShowMoreActions(false);
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
        document.body.classList.remove('mobile-chat-active');
        // Clear any query parameter e.g. ?chatId=... so it doesn't immediately reselect
        if (location.search || location.state?.chatId || location.state?.openChatWith) {
            navigate('/chat', { replace: true, state: {} });
        }
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('tcd:active-chat-changed', { detail: { chatId: null } }));
        }
    }, [location.search, location.state, navigate, selectedConv?.id, newMessage]);

    useEffect(() => {
        if (!selectedConv) return;

        const handleHardwareBack = (e) => {
            e.preventDefault();
            handleCloseConversation();
        };

        window.addEventListener('tcd:hardware-back', handleHardwareBack);
        return () => {
            window.removeEventListener('tcd:hardware-back', handleHardwareBack);
        };
    }, [selectedConv, handleCloseConversation]);

    // Restore sidebar scroll position when returning from active chat to inbox
    useEffect(() => {
        if (!selectedConv && sidebarRef.current && sidebarScrollPos.current > 0) {
            const pos = sidebarScrollPos.current;
            requestAnimationFrame(() => {
                if (sidebarRef.current) {
                    sidebarRef.current.scrollTop = pos;
                }
            });
        }
    }, [selectedConv]);

    const handleSelectConversation = useCallback((conv) => {
        if (sidebarRef.current) {
            sidebarScrollPos.current = sidebarRef.current.scrollTop;
        }
        if (selectedConv?.id && selectedConv.id !== conv?.id) {
            draftsByConvRef.current[selectedConv.id] = newMessage;
        }
        const restoredDraft = (conv?.id && draftsByConvRef.current[conv.id]) || '';
        setNewMessage(restoredDraft);

        setSelectedConv(conv);
        setPendingSelection(null);

        // Fast background fresh-avatar check for conversation partner
        if (conv?.other_user?.id) {
            supabase
                .from('profiles')
                .select('id, full_name, avatar_url, profile_photos, photo_updated_at, updated_at, is_verified, photo_verified')
                .eq('id', conv.other_user.id)
                .maybeSingle()
                .then(({ data }) => {
                    if (data) {
                        const freshAvatar = getAvatarUrl(data);
                        setSelectedConv(prev => {
                            if (!prev || prev.id !== conv.id) return prev;
                            return {
                                ...prev,
                                other_user: {
                                    ...prev.other_user,
                                    ...data,
                                    avatar_url: freshAvatar
                                }
                            };
                        });
                    }
                }).catch(() => {});
        }

        if (conv?.has_unread) {
            revalidateConvs(
                (prev) => (prev || []).map(c => c.id === conv.id ? { ...c, has_unread: false, unread_count: 0 } : c),
                false
            );
        }
        if (conv?.id && conv.id !== 'null' && !String(conv.id).startsWith('temp-')) {
            navigate(`/chat?chatId=${conv.id}`, { replace: true });
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('tcd:active-chat-changed', { detail: { chatId: conv.id } }));
            }
        }
    }, [navigate, revalidateConvs, selectedConv?.id, newMessage]);

    // Fast background fresh-avatar check whenever active conversation changes (e.g. via route, deep link, or selection)
    useEffect(() => {
        const partnerId = selectedConv?.other_user?.id;
        if (!partnerId) return;

        supabase
            .from('profiles')
            .select('id, full_name, avatar_url, profile_photos, photo_updated_at, updated_at, is_verified, photo_verified')
            .eq('id', partnerId)
            .maybeSingle()
            .then(({ data }) => {
                if (data) {
                    const freshAvatar = getAvatarUrl(data);
                    setSelectedConv(prev => {
                        if (!prev || prev.other_user?.id !== partnerId) return prev;
                        if (prev.other_user?.avatar_url === freshAvatar) return prev;
                        return {
                            ...prev,
                            other_user: {
                                ...prev.other_user,
                                ...data,
                                avatar_url: freshAvatar
                            }
                        };
                    });
                }
            }).catch(() => {});
    }, [selectedConv?.other_user?.id]);

    // Realtime subscription for conversation partner profile updates (avatar, name, verification)
    useEffect(() => {
        const partnerId = selectedConv?.other_user?.id;
        if (!partnerId) return;

        const channel = supabase
            .channel(`partner_profile_sync:${partnerId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'profiles',
                filter: `id=eq.${partnerId}`
            }, (payload) => {
                if (payload.new) {
                    const ts = payload.new.photo_updated_at || payload.new.updated_at || Date.now();
                    registerProfilePhotoTimestamp(partnerId, ts);
                    const freshAvatar = getAvatarUrl(payload.new);
                    setSelectedConv(prev => {
                        if (!prev || prev.other_user?.id !== partnerId) return prev;
                        return {
                            ...prev,
                            other_user: {
                                ...prev.other_user,
                                ...payload.new,
                                avatar_url: freshAvatar
                            }
                        };
                    });
                    revalidateConvs();
                }
            })
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }, [selectedConv?.other_user?.id, revalidateConvs]);

    // Revalidate conversation avatars and active chat header when a profile photo update event is fired
    useEffect(() => {
        const handlePhotoUpdated = (e) => {
            const updatedUserId = e?.detail?.userId;
            const updatedTs = e?.detail?.timestamp;
            if (updatedUserId && updatedTs) {
                registerProfilePhotoTimestamp(updatedUserId, updatedTs);
            }
            if (revalidateConvs) revalidateConvs();
            if (selectedConv?.other_user?.id && (!updatedUserId || selectedConv.other_user.id === updatedUserId)) {
                supabase
                    .from('profiles')
                    .select('id, full_name, avatar_url, profile_photos, photo_updated_at, updated_at, is_verified, photo_verified')
                    .eq('id', selectedConv.other_user.id)
                    .maybeSingle()
                    .then(({ data }) => {
                        if (data) {
                            const freshAvatar = getAvatarUrl(data);
                            setSelectedConv(prev => {
                                if (!prev || prev.other_user?.id !== data.id) return prev;
                                return {
                                    ...prev,
                                    other_user: {
                                        ...prev.other_user,
                                        ...data,
                                        avatar_url: freshAvatar
                                    }
                                };
                            });
                        }
                    }).catch(() => {});
            }
        };
        window.addEventListener('cd:profile-photo-updated', handlePhotoUpdated);
        return () => window.removeEventListener('cd:profile-photo-updated', handlePhotoUpdated);
    }, [revalidateConvs, selectedConv?.other_user?.id]);

    // Revalidate messages & conversation list when a virtual gift is sent
    useEffect(() => {
        const handleGiftSent = (e) => {
            if (revalidateConvs) revalidateConvs();
            if (e.detail?.matchId && selectedConv?.id === e.detail.matchId) {
                loadMessages(e.detail.matchId, 0, false);
            }
        };
        window.addEventListener('tcd:gift-sent', handleGiftSent);
        return () => window.removeEventListener('tcd:gift-sent', handleGiftSent);
    }, [revalidateConvs, selectedConv?.id]);

    // ── Contextual Actions for Chat List Bottom Sheet & Gestures ──
    const handleToggleConvRead = useCallback((conv) => {
        if (!conv?.id) return;
        const isCurrentlyUnread = Boolean(conv.has_unread);
        if (isCurrentlyUnread) {
            markConversationRead(conv.id, currentUser?.id);
            if (typeof markConversationNotificationsRead === 'function') {
                markConversationNotificationsRead(conv.id);
            }
            revalidateConvs(
                (prev) => (prev || []).map(c => c.id === conv.id ? { ...c, has_unread: false, unread_count: 0 } : c),
                false
            );
            addToast('Marked as read', 'info');
        } else {
            revalidateConvs(
                (prev) => (prev || []).map(c => c.id === conv.id ? { ...c, has_unread: true, unread_count: 1 } : c),
                false
            );
            window.dispatchEvent(new CustomEvent('tcd:conversations-unread-updated', { detail: { count: 1 } }));
            addToast('Marked as unread', 'info');
        }
    }, [currentUser?.id, markConversationNotificationsRead, revalidateConvs, addToast]);

    const handleViewProfile = useCallback((conv) => {
        const targetUser = conv?.other_user;
        if (targetUser) {
            handleAvatarClick(targetUser, null, conv.id);
        }
    }, [handleAvatarClick]);

    const handleToggleConvMute = useCallback((conv) => {
        if (!conv?.id) return;
        setMutedConvs(prev => {
            const isMuted = prev.includes(conv.id);
            const updated = isMuted ? prev.filter(id => id !== conv.id) : [...prev, conv.id];
            try {
                localStorage.setItem('tcd_muted_convs', JSON.stringify(updated));
            } catch (e) {
                console.warn('[Chat] Failed to persist muted convs:', e);
            }
            addToast(isMuted ? 'Notifications unmuted' : 'Notifications muted', 'info');
            return updated;
        });
    }, [addToast]);

    const handleDeleteConv = useCallback(async (conv) => {
        if (!conv?.id) return;
        try {
            revalidateConvs((prev) => (prev || []).filter(c => c.id !== conv.id), false);
            if (selectedConv?.id === conv.id) {
                handleCloseConversation();
            }
            await supabase.from('matches').delete().eq('id', conv.id);
            addToast('Conversation removed', 'info');
        } catch (err) {
            console.warn('[Chat] Delete conversation error:', err);
        }
    }, [revalidateConvs, selectedConv?.id, handleCloseConversation, addToast]);

    const handleConvTouchStart = (e, conv) => {
        const touch = e.touches[0];
        convTouchStartRef.current = {
            x: touch.clientX,
            y: touch.clientY,
            time: Date.now(),
            id: conv.id,
            isScrolling: false
        };

        if (convLongPressTimerRef.current) {
            clearTimeout(convLongPressTimerRef.current);
        }

        convLongPressTimerRef.current = setTimeout(() => {
            triggerLightHaptic();
            setContextConv(conv);
            setSwipedConvId(null);
            setSwipedOffset(0);
        }, 500);
    };

    const handleConvTouchMove = (e, conv) => {
        const touch = e.touches[0];
        const dx = touch.clientX - convTouchStartRef.current.x;
        const dy = touch.clientY - convTouchStartRef.current.y;

        // Disambiguate vertical scroll vs horizontal swipe
        if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) {
            // User is scrolling vertically through list
            if (convLongPressTimerRef.current) {
                clearTimeout(convLongPressTimerRef.current);
                convLongPressTimerRef.current = null;
            }
            convTouchStartRef.current.isScrolling = true;
            return;
        }

        if (Math.abs(dx) > 10) {
            // Horizontal swipe gesture in progress
            if (convLongPressTimerRef.current) {
                clearTimeout(convLongPressTimerRef.current);
                convLongPressTimerRef.current = null;
            }
        }
    };

    const handleConvTouchEnd = (e, conv) => {
        if (convLongPressTimerRef.current) {
            clearTimeout(convLongPressTimerRef.current);
            convLongPressTimerRef.current = null;
        }

        if (convTouchStartRef.current.isScrolling) {
            return;
        }

        const touch = e.changedTouches[0];
        const dx = touch.clientX - convTouchStartRef.current.x;
        const dt = Date.now() - convTouchStartRef.current.time;

        if (dx > 60) {
            // Swiped right -> reveal left read/unread action (76px)
            triggerLightHaptic();
            setSwipedConvId(swipedConvId === conv.id ? null : conv.id);
            setSwipedOffset(76);
        } else if (dx < -60) {
            // Swiped left -> reveal right actions (-110px)
            triggerLightHaptic();
            setSwipedConvId(swipedConvId === conv.id ? null : conv.id);
            setSwipedOffset(-110);
        } else if (Math.abs(dx) < 10 && dt < 450) {
            // Normal tap
            if (swipedConvId) {
                setSwipedConvId(null);
                setSwipedOffset(0);
            } else {
                handleSelectConversation(conv);
            }
        }
    };

    useEffect(() => {
        const convId = selectedConv?.id;
        if (!convId || convId === 'null' || !currentUser?.id || !userProfile?.id) {
            activeConvIdRef.current = null;
            return;
        }

        const isNewConv = activeConvIdRef.current !== convId;
        activeConvIdRef.current = convId;

        if (isNewConv) {
            setPage(0);
            const cachedMessages = getCachedData(messageCacheKey(currentUser.id, convId), {
                ttlMs: CACHE_TTL.messages,
                allowStale: true
            }) || [];
            const queuedMessages = getQueuedOperations(currentUser.id, 'send_message')
                .filter(operation => operation.payload?.matchId === convId)
                .map(queuedMessageToBubble)
                .filter(Boolean);
            const initialMessages = [...cachedMessages, ...queuedMessages].reduce(mergeMessageList, []);
            setMessages(initialMessages);
            if (initialMessages.length === 0) {
                setMessagesLoading(true);
            }
            loadMessages(convId, 0, true);
        }

        markConversationRead(convId, currentUser.id);
        if (typeof markConversationNotificationsRead === 'function') {
            markConversationNotificationsRead(convId);
        }

        const msgSub = subscribeToMessages(
            convId,
            (payload) => {
                const nowIso = new Date().toISOString();
                if (payload.expires_at && payload.expires_at <= nowIso) return;
                setMessages(prev => mergeMessageList(prev, payload));
                if (payload.sender_id !== currentUser.id) {
                    markMessageAsRead(payload.id);
                    if (payload.type === 'gift') {
                        const giftMeta = payload.metadata || {};
                        const giftId = giftMeta.gift_id || 'rose';
                        const giftPreset = VIRTUAL_GIFTS.find(g => g.id === giftId) || VIRTUAL_GIFTS[0];
                        const giftData = {
                            id: giftId,
                            name: giftMeta.gift_name || giftMeta.name || giftPreset.name,
                            emoji: giftMeta.gift_emoji || giftPreset.emoji,
                            coins: giftMeta.gift_coins || giftMeta.coins || giftPreset.coins,
                            color: giftMeta.gift_color || giftMeta.color || giftPreset.color,
                            desc: giftPreset.desc,
                            earningCreditNgn: giftMeta.earning_credit_ngn ?? giftPreset.earningCreditNgn ?? ((giftMeta.gift_coins || giftPreset.coins) * 8),
                            matchId: convId
                        };
                        const senderData = {
                            id: payload.sender_id,
                            name: selectedConv?.other_user?.full_name || selectedConv?.other_user?.name || 'Someone Special',
                            avatar_url: selectedConv?.other_user?.avatar_url || selectedConv?.other_user?.avatar
                        };
                        triggerGiftCelebration?.(giftData, senderData);
                    } else {
                        const isTabFocusedAndVisible = typeof document !== 'undefined' && !document.hidden && (typeof document.hasFocus === 'function' ? document.hasFocus() : true);
                        if (!isTabFocusedAndVisible) {
                            playNotificationDing(); // Only ding when user is backgrounded or tab unfocused
                        }
                    }
                }
            },
            (payload) => {
                const nowIso = new Date().toISOString();
                if (payload.expires_at && payload.expires_at <= nowIso) {
                    setMessages(prev => prev.filter(m => m.id !== payload.id));
                    return;
                }
                setMessages(prev => prev.map(m => m.id === payload.id ? payload : m));
            },
            (payload) => {
                setMessages(prev => prev.filter(m => m.id !== payload.id));
            },
            (updatedMatch) => {
                if (updatedMatch) {
                    setSelectedConv(prev => prev ? {
                        ...prev,
                        disappearing_messages_seconds: updatedMatch.disappearing_messages_seconds ?? prev.disappearing_messages_seconds,
                        call_state: updatedMatch.call_state ?? prev.call_state,
                        call_type: updatedMatch.call_type ?? prev.call_type,
                        caller_id: updatedMatch.caller_id ?? prev.caller_id
                    } : prev);
                }
            }
        );

        presenceChannelRef.current = setupPresence(
            convId,
            currentUser.id,
            userProfile,
            (state) => setPresence(state)
        );

        return () => {
            try {
                msgSub?.unsubscribe?.();
                presenceChannelRef.current?.unsubscribe?.();
            } catch (cleanupErr) {
                console.warn('[Chat] cleanup error:', cleanupErr);
            }
            isTypingRef.current = false;
            setReactionBar(null);
            if (longPressTimer.current) {
                clearTimeout(longPressTimer.current);
                longPressTimer.current = null;
            }
        };
    }, [selectedConv?.id, currentUser?.id, userProfile?.id, mergeMessageList]);

    // ── Load messages (paginated) ──────────────────────────────────────
    async function loadMessages(matchId, pageNum = 0, reset = false) {
        if (!matchId || matchId === 'null' || String(matchId).startsWith('temp-')) {
            setMessagesLoading(false);
            return;
        }
        try {
            const { data = [], total = 0, error } = await getMessages(matchId, pageNum);

            if (error) {
                console.warn('[Chat] Failed to load messages:', error);
                return;
            }

            const nowIso = new Date().toISOString();
            const unexpiredData = (data || []).filter(m => !m.expires_at || m.expires_at > nowIso);

            if (reset) {
                setMessages(prev => {
                    const pending = prev.filter(msg => {
                        if (!msg._pending && !msg._queued) return false;
                        const nonce = msg.metadata?.client_nonce;
                        const alreadyConfirmed = unexpiredData.some(dbMsg => 
                            dbMsg.id === msg.id || (nonce && dbMsg.metadata?.client_nonce === nonce)
                        );
                        return !alreadyConfirmed;
                    });
                    return [...unexpiredData, ...pending].reduce(mergeMessageList, []);
                });
                setHasMore(total > unexpiredData.length);
            } else {
                setMessages(prev => {
                    const combined = [...unexpiredData, ...prev];
                    return combined.length > 200 ? combined.slice(-200) : combined;
                });
                setHasMore(total > (pageNum + 1) * 20);
            }
        } catch (err) {
            console.error('[Chat] loadMessages error:', err);
        } finally {
            setMessagesLoading(false);
        }
    }

    useEffect(() => {
        if (!currentUser?.id || !selectedConv?.id || selectedConv.id === 'null') return;
        if (!Array.isArray(messages)) return;
        setCachedData(
            messageCacheKey(currentUser.id, selectedConv.id),
            trimCacheList(messages, CACHE_LIMITS.messagesPerConversation),
            { userId: currentUser.id, type: 'messages' }
        );
    }, [currentUser?.id, selectedConv?.id, messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        markFeatureUsed('messages_chat');
        if (currentUser?.id) {
            recordQuestProgress(currentUser.id, 'quest_icebreaker', 1);
        }
        if (!newMessage.trim() || !selectedConv || sending) return;

        // Block sending ONLY if we truly don't have a database ID yet
        const isInvalidId = !selectedConv.id || (typeof selectedConv.id === 'string' && selectedConv.id.startsWith('temp-'));
        
        if (isInvalidId) {
            addToast('⏳ Match is still syncing… please wait a moment and try again!', 'info');
            revalidateConvs(); // force a refresh to try to get the real match
            return;
        }

        const content = newMessage.trim();

        // Keep conversations on TheCollegeDate: block phone numbers, social handles, emails,
        // external messaging links and "let's move to WhatsApp" requests before anything is sent.
        // Exception: Elite Ultra VIP subscribers (₦15,000/mo) are exempt and can ask/share contacts freely without safeguards.
        const isUltra = isEliteUltra(userProfile);
        if (!isUltra) {
            const recentWindowMs = 3 * 60 * 1000;
            const nowMs = Date.now();
            const recentOwnTexts = editingMessage ? [] : messages
                .filter(m => m && m.sender_id === currentUser?.id && (m.type || 'text') === 'text'
                    && typeof m.content === 'string'
                    && nowMs - new Date(m.created_at || 0).getTime() < recentWindowMs)
                .slice(-4)
                .map(m => m.content);
            const offPlatformCheck = detectOffPlatformContactWithHistory(content, recentOwnTexts, userProfile);
            if (offPlatformCheck.blocked) {
                showOffPlatformBlock(offPlatformCheck);
                return;
            }
        }

        if (editingMessage) {
            let targetId = editingMessage.id;
            const isTemp = !targetId || String(targetId).startsWith('temp-');
            if (isTemp) {
                const nonce = editingMessage.metadata?.client_nonce;
                const confirmed = messages.find(m => (
                    m && !String(m.id).startsWith('temp-') && (
                        (nonce && m.metadata?.client_nonce === nonce) ||
                        (m.sender_id === currentUser?.id && m.content === editingMessage.content)
                    )
                ));
                if (confirmed) {
                    targetId = confirmed.id;
                } else {
                    addToast('⏳ Message is still syncing with the server. Please wait a moment.', 'info');
                    return;
                }
            }

            setSending(true);
            const { data, error, blocked, violation } = await editMessage(targetId, content, undefined, {
                isUltraSender: isUltra,
                senderProfile: userProfile
            });
            if (blocked) {
                showOffPlatformBlock(violation);
            } else if (error) {
                addToast(`Edit failed: ${error}`, 'error');
            } else if (data) {
                setMessages(prev => prev.map(m => (m.id === targetId || m.id === editingMessage.id) ? { ...m, ...data, content, is_edited: true, edited_at: new Date().toISOString() } : m));
                addToast('Message edited!', 'success');
                setEditingMessage(null);
                setNewMessage('');
            }
            setSending(false);
            return;
        }

        const optimisticId = `temp-${Date.now()}`;
        const clientNonce = createClientNonce();
        
        const metadata = { 
            client_nonce: clientNonce,
            isUltraSender: Boolean(isUltra),
            canBypassSafeguards: Boolean(isUltra),
            senderProfile: userProfile,
            recipientIsActive: Boolean(isOtherOnline),
            suppressPush: Boolean(isOtherOnline),
            suppress_push: Boolean(isOtherOnline),
            suppress_email: Boolean(isOtherOnline)
        };
        if (replyToMessage) {
            metadata.reply_to = {
                id: replyToMessage.id,
                sender: replyToMessage.sender,
                content: replyToMessage.content
            };
        }

        const optimisticMsg = {
            id: optimisticId, match_id: selectedConv.id, sender_id: currentUser.id,
            content, type: 'text', metadata, created_at: new Date().toISOString(),
            is_read: false, _pending: true
        };

        setMessages(prev => mergeMessageList(prev, optimisticMsg));
        if (selectedConv?.id) {
            delete draftsByConvRef.current[selectedConv.id];
        }
        setNewMessage('');
        setReplyToMessage(null);
        setSending(true);
        stopTyping();

        const queuePayload = {
            matchId: selectedConv.id,
            senderId: currentUser.id,
            content,
            type: 'text',
            metadata,
            optimisticId,
            createdAt: optimisticMsg.created_at
        };

        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            enqueueOfflineOperation(currentUser.id, {
                id: `send_message:${clientNonce}`,
                type: 'send_message',
                payload: queuePayload
            });
            setSending(false);
            addToast('You are offline. Message will send when connection returns.', 'info');
            return;
        }

        const { data, error, blocked, violation } = await sendMessage(selectedConv.id, currentUser.id, content, 'text', metadata);
        if (blocked) {
            setMessages(prev => prev.filter(m => m.id !== optimisticId));
            setNewMessage(content);
            setSending(false);
            showOffPlatformBlock(violation);
            return;
        }
        if (error) {
            enqueueOfflineOperation(currentUser.id, {
                id: `send_message:${clientNonce}`,
                type: 'send_message',
                payload: queuePayload,
                lastError: error?.message || String(error)
            });
            setMessages(prev => prev.map(m => m.id === optimisticId ? { ...m, _pending: true, _queued: true, _failed: true } : m));
            addToast('Message saved. We will retry when your connection returns.', 'info');
        } else if (data) {
            removeOfflineOperation(currentUser.id, `send_message:${clientNonce}`);
            setMessages(prev => mergeMessageList(prev, data));
            playSendSwoosh(); // Audible "sent" confirmation
            if (currentUser?.id) {
                recordStreakActivity(currentUser.id, 'chat_message').catch(() => {});
                evaluateDailyQualification(currentUser.id).catch(() => {});
            }
        }
        setSending(false);
    };

    const handleSmartReplies = async () => {
        if (!selectedConv || aiReplyLoading) return;
        setAiReplyLoading(true);
        addToast('✨ Asking AI wingmate for smart suggestions...', 'info');
        try {
            const hasRecentMsgs = messages.length > 0;
            const task = hasRecentMsgs ? 'smart_reply' : 'conversation_opener';
            const { data, error } = await requestAiAssistant(task, {
                targetProfile: selectedConv?.other_user,
                recentMessages: messages.slice(-8),
                draft: newMessage
            });
            const replies = (data?.replies || data?.openers || []).filter(Boolean);
            if (replies.length > 0) {
                setAiReplies(replies);
                addToast('✨ Smart suggestions ready!', 'success');
            } else {
                setAiReplies(CAMPUS_AI_FALLBACKS);
                addToast('✨ Campus icebreakers ready!', 'success');
            }
        } catch (err) {
            console.warn('[Chat] Smart replies fallback:', err);
            setAiReplies(CAMPUS_AI_FALLBACKS);
        } finally {
            setAiReplyLoading(false);
        }
    };

    const handleSelectAiReply = (replyText) => {
        if (!replyText) return;
        setNewMessage(replyText);
        setAiReplies([]); // Auto-minimize / close strip
        // Focus chat input field
        setTimeout(() => {
            const inputEl = document.querySelector('.chat-input');
            if (inputEl) inputEl.focus();
        }, 50);
    };

    const handleSelectIcebreaker = (promptText) => {
        if (!promptText) return;
        setNewMessage(promptText);
        triggerLightHaptic();
        setTimeout(() => {
            if (chatInputRef.current) {
                chatInputRef.current.focus();
                chatInputRef.current.selectionStart = chatInputRef.current.value.length;
                chatInputRef.current.selectionEnd = chatInputRef.current.value.length;
            }
        }, 60);
    };


    const flushPendingMessages = useCallback(async () => {
        if (!currentUser?.id) return;

        const result = await drainOfflineQueue(currentUser.id, {
            send_message: async (operation) => {
                const payload = operation.payload || {};
                const { data, error, blocked } = await sendMessage(
                    payload.matchId,
                    payload.senderId,
                    payload.content,
                    payload.type || 'text',
                    payload.metadata || {}
                );

                if (blocked) {
                    // Never deliver off-platform contact info; drop the queued op and its optimistic bubble.
                    if (payload.optimisticId) setMessages(prev => prev.filter(m => m.id !== payload.optimisticId));
                    return;
                }

                if (error) throw new Error(error?.message || String(error));

                if (data && payload.matchId === selectedConv?.id) {
                    setMessages(prev => mergeMessageList(prev, data));
                }
            }
        }, { maxBatch: 5 });

        if (result.processed > 0) {
            revalidateConvs();
            addToast(`${result.processed} pending message${result.processed === 1 ? '' : 's'} sent.`, 'success');
        }
    }, [addToast, currentUser?.id, mergeMessageList, revalidateConvs, selectedConv?.id]);

    useEffect(() => {
        if (!currentUser?.id) return;

        const handleOnline = () => {
            setTimeout(() => {
                flushPendingMessages();
            }, 800);
        };

        window.addEventListener('online', handleOnline);
        if (navigator.onLine !== false) {
            flushPendingMessages();
        }

        return () => window.removeEventListener('online', handleOnline);
    }, [currentUser?.id, flushPendingMessages]);

    const handleRetryMessage = async (msg) => {
        if (!msg || !currentUser?.id) return;
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            addToast('You are currently offline. Message will send once connection returns.', 'info');
            return;
        }

        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, _pending: true, _failed: false } : m));
        const clientNonce = toValidUuidNonce(msg.metadata?.client_nonce);
        const metadata = {
            ...(msg.metadata || {}),
            client_nonce: clientNonce,
            recipientIsActive: Boolean(isOtherOnline),
            suppressPush: Boolean(isOtherOnline),
            suppress_push: Boolean(isOtherOnline),
            suppress_email: Boolean(isOtherOnline)
        };

        try {
            const { data, error, blocked, violation } = await sendMessage(
                msg.match_id || selectedConv?.id,
                currentUser.id,
                msg.content,
                msg.type || 'text',
                metadata
            );

            if (blocked) {
                removeOfflineOperation(currentUser.id, `send_message:${clientNonce}`);
                setMessages(prev => prev.filter(m => m.id !== msg.id));
                showOffPlatformBlock(violation);
                return;
            }

            if (error) {
                setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, _pending: true, _failed: true } : m));
                addToast('Could not resend message. Tap retry again when signal improves.', 'error');
            } else if (data) {
                removeOfflineOperation(currentUser.id, `send_message:${clientNonce}`);
                setMessages(prev => mergeMessageList(prev, data));
                playSendSwoosh();
                addToast('Message sent! 🚀', 'success');
            }
        } catch (err) {
            console.error('[Chat] Retry message exception:', err);
            setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, _pending: true, _failed: true } : m));
            addToast('Could not resend: ' + (err.message || 'Network error'), 'error');
        }
    };

    const handleTyping = () => {
        if (!selectedConv || !currentUser || !userProfile) return;
        if (!isTypingRef.current) {
            isTypingRef.current = true;
            updateTypingStatus(presenceChannelRef.current, currentUser.id, userProfile, true);
        }
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(stopTyping, 3000);
    };

    const stopTyping = () => {
        if (isTypingRef.current) {
            isTypingRef.current = false;
            if (userProfile) updateTypingStatus(presenceChannelRef.current, currentUser.id, userProfile, false);
        }
    };

    // ── Call Signaling ──────────────────────────────────────────────
    const handleSendMiniGame = async (gamePayload) => {
        if (!selectedConv?.id || !currentUser?.id) return;
        try {
            const { content: gameContent, type: gameType, metadata: gameMeta } = gamePayload;
            await sendMessage(
                selectedConv.id,
                currentUser.id,
                gameContent,
                gameType || 'mini_game',
                {
                    ...(gameMeta || {}),
                    senderProfile: userProfile
                }
            );
            recordQuestProgress(currentUser.id, 'quest_icebreaker', 1);
            revalidateConvs();
        } catch (err) {
            console.error('Error sending mini-game:', err);
            addToast('Could not send mini-game. Try again.', 'error');
        }
    };

    const initiateCall = async (type) => {
        if (!selectedConv?.id) return;
        setCallChoiceOpen(false);
        const otherUser = selectedConv?.other_user || {};
        const name = encodeURIComponent(otherUser.full_name || 'User');
        const avatar = encodeURIComponent(getAvatarUrl(otherUser) || otherUser.avatar_url || '');
        const roomId = selectedConv.id;
        
        try {
            // 1. Signal match & session call state in DB for real-time ring
            const { data: callData, error: signalError } = await initiateCallSignal(roomId, type);
            if (signalError) {
                addToast(signalError, 'error');
                return;
            }

            const callId = callData?.call_id || roomId;

            // 2. Send Signaling Message (The "Ring")
            const callTypeLabel = type === 'video' ? 'Video Call' : 'Voice Call';
            await sendMessage(roomId, currentUser.id, `Started a ${callTypeLabel}`, 'call_log', {
                callType: type,
                callId: callId,
                roomId: roomId,
                startTime: new Date().toISOString()
            });

            // 3. Navigate to Call Room with callId and other user's info
            navigate(`/call/${callId}?matchId=${roomId}&type=${type}&name=${name}&avatar=${avatar}`);
        } catch (err) {
            console.error('initiateCall exception:', err);
            navigate(`/call/${roomId}?type=${type}&name=${name}&avatar=${avatar}`);
        }
    };

    const handleVoiceStop = async (blob) => {
        if (!selectedConv?.id || !blob) return;
        setSending(true);
        const optimisticId = `temp-voice-${Date.now()}`;
        const clientNonce = createClientNonce();
        const localAudioUrl = URL.createObjectURL(blob);

        // Optimistic voice note bubble immediately!
        setMessages(prev => mergeMessageList(prev, {
            id: optimisticId,
            match_id: selectedConv.id,
            sender_id: currentUser.id,
            content: localAudioUrl,
            type: 'voice',
            metadata: { client_nonce: clientNonce, is_optimistic: true },
            created_at: new Date().toISOString(),
            is_read: false,
            _pending: true
        }));

        try {
            const { path, url, error } = await uploadVoiceNote(selectedConv.id, currentUser.id, blob);
            if (error) throw new Error(error);
            const { data, error: sendError } = await sendMessage(selectedConv.id, currentUser.id, path, 'voice', {
                client_nonce: clientNonce,
                storage_path: path,
                preview_url: url,
                recipientIsActive: Boolean(isOtherOnline),
                suppressPush: Boolean(isOtherOnline),
                suppress_push: Boolean(isOtherOnline),
                suppress_email: Boolean(isOtherOnline)
            });
            if (sendError) throw new Error(sendError);
            if (data) {
                setMessages(prev => mergeMessageList(prev, data));
            }
        } catch (err) {
            console.error('[Chat] Voice note send error:', err);
            setMessages(prev => prev.filter(m => m.id !== optimisticId));
            addToast('Failed to send voice note', 'error');
        } finally {
            setSending(false);
        }
    };

    const handleMediaSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file || !selectedConv) return;
        const isVideo = file.type.startsWith('video/');

        if (isVideo) {
            // 1. Premium check
            if (!hasActivePremium(userProfile)) {
                addToast('👑 10s Chat Video is an exclusive Premium benefit. Upgrade to unlock!', 'info');
                navigate('/premium');
                e.target.value = '';
                return;
            }

            // 2. Daily limit check (1 video per calendar day)
            const todayStr = new Date().toISOString().split('T')[0];
            const dailyVideoKey = `tcd_daily_chat_video_${currentUser?.id}_${todayStr}`;
            if (localStorage.getItem(dailyVideoKey)) {
                addToast('You have used your 1 daily video for today! Resets at midnight.', 'info');
                e.target.value = '';
                return;
            }

            if (file.size > 30 * 1024 * 1024) {
                addToast('Video exceeds 30MB limit', 'error');
                e.target.value = '';
                return;
            }

            // 3. Duration check <= 10.5s
            const tempObjUrl = URL.createObjectURL(file);
            const videoEl = document.createElement('video');
            videoEl.preload = 'metadata';
            videoEl.onloadedmetadata = () => {
                URL.revokeObjectURL(tempObjUrl);
                if (videoEl.duration > 10.5) {
                    addToast(`Video is ${Math.round(videoEl.duration)}s. Maximum duration is 10 seconds.`, 'error');
                    return;
                }
                const previewUrl = URL.createObjectURL(file);
                setPendingMediaUpload({
                    file,
                    previewUrl,
                    mediaType: 'video',
                    isViewOnce: false
                });
            };
            videoEl.onerror = () => {
                URL.revokeObjectURL(tempObjUrl);
                addToast('Could not verify video duration.', 'error');
            };
            videoEl.src = tempObjUrl;
            e.target.value = '';
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            addToast('Photo exceeds 10MB limit', 'error');
            e.target.value = '';
            return;
        }

        const previewUrl = URL.createObjectURL(file);
        setPendingMediaUpload({
            file,
            previewUrl,
            mediaType: 'image',
            isViewOnce: false
        });
        e.target.value = '';
    };

    const handleConfirmMediaSend = async () => {
        if (!pendingMediaUpload || !selectedConv) return;
        const { file, mediaType, isViewOnce, previewUrl } = pendingMediaUpload;
        setSending(true);
        const optimisticId = `temp-${Date.now()}`;
        const clientNonce = createClientNonce();

        try {
            if (isViewOnce) {
                // View Once Flow
                let uploadResult;
                if (mediaType === 'image') {
                    const compressed = await compressImage(file, { targetSizeKB: 120 });
                    uploadResult = await uploadChatImage(selectedConv.id, currentUser.id, compressed);
                } else {
                    uploadResult = await uploadChatVideo(selectedConv.id, currentUser.id, file);
                }
                if (uploadResult.error) throw new Error(uploadResult.error);

                const viewOnceTitle = mediaType === 'video' ? 'View Once Video' : 'View Once Photo';
                const { data, error } = await sendMessage(
                    selectedConv.id,
                    currentUser.id,
                    viewOnceTitle,
                    'view_once',
                    {
                        storage_path: uploadResult.path,
                        media_type: mediaType,
                        is_viewed: false,
                        client_nonce: clientNonce,
                        recipientIsActive: Boolean(isOtherOnline),
                        suppressPush: Boolean(isOtherOnline),
                        suppress_push: Boolean(isOtherOnline),
                        suppress_email: Boolean(isOtherOnline)
                    }
                );
                if (error) throw new Error(error);
                if (data) setMessages(prev => mergeMessageList(prev, data));
                addToast('Sent View-Once media ①', 'success');
            } else {
                // Standard Media Flow
                if (mediaType === 'image') {
                    const placeholder = await generateBlurPlaceholder(file);
                    setMessages(prev => mergeMessageList(prev, {
                        id: optimisticId, match_id: selectedConv.id, sender_id: currentUser.id,
                        content: previewUrl, type: 'image', metadata: { placeholder, client_nonce: clientNonce },
                        created_at: new Date().toISOString(), is_read: false, _pending: true
                    }));

                    const compressed = await compressImage(file, { targetSizeKB: 100 });
                    const { path, url, error } = await uploadChatImage(selectedConv.id, currentUser.id, compressed);
                    if (error) throw new Error(error);

                    const { data } = await sendMessage(selectedConv.id, currentUser.id, path, 'image', {
                        placeholder,
                        client_nonce: clientNonce,
                        storage_path: path,
                        preview_url: url,
                        recipientIsActive: Boolean(isOtherOnline),
                        suppressPush: Boolean(isOtherOnline),
                        suppress_push: Boolean(isOtherOnline),
                        suppress_email: Boolean(isOtherOnline)
                    });
                    if (data) setMessages(prev => mergeMessageList(prev, data));
                } else {
                    // Video
                    setMessages(prev => mergeMessageList(prev, {
                        id: optimisticId, match_id: selectedConv.id, sender_id: currentUser.id,
                        content: previewUrl, type: 'video', metadata: { client_nonce: clientNonce },
                        created_at: new Date().toISOString(), is_read: false, _pending: true
                    }));

                    const { path, url, error } = await uploadChatVideo(selectedConv.id, currentUser.id, file);
                    if (error) throw new Error(error);

                    const { data } = await sendMessage(selectedConv.id, currentUser.id, path, 'video', {
                        client_nonce: clientNonce,
                        storage_path: path,
                        preview_url: url,
                        recipientIsActive: Boolean(isOtherOnline),
                        suppressPush: Boolean(isOtherOnline),
                        suppress_push: Boolean(isOtherOnline),
                        suppress_email: Boolean(isOtherOnline)
                    });
                    if (data) {
                        setMessages(prev => mergeMessageList(prev, data));
                        const todayStr = new Date().toISOString().split('T')[0];
                        localStorage.setItem(`tcd_daily_chat_video_${currentUser?.id}_${todayStr}`, '1');
                    }
                }
            }
        } catch (err) {
            console.error('[Chat] Media send error:', err);
            setMessages(prev => prev.filter(m => m.id !== optimisticId));
            addToast('Failed to send media: ' + err.message, 'error');
        } finally {
            setSending(false);
            if (pendingMediaUpload?.previewUrl) {
                URL.revokeObjectURL(pendingMediaUpload.previewUrl);
            }
            setPendingMediaUpload(null);
        }
    };

    const handleDocumentSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !selectedConv) return;
        const MAX_DOC_SIZE = 25 * 1024 * 1024; // 25MB
        if (file.size > MAX_DOC_SIZE) {
            addToast(`Document (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds 25MB limit.`, 'error');
            e.target.value = '';
            return;
        }

        setSending(true);
        const optimisticId = `temp-${Date.now()}`;
        const clientNonce = createClientNonce();
        try {
            setMessages(prev => mergeMessageList(prev, {
                id: optimisticId, match_id: selectedConv.id, sender_id: currentUser.id,
                content: file.name, type: 'document',
                metadata: { filename: file.name, file_size: file.size, mime_type: file.type, client_nonce: clientNonce },
                created_at: new Date().toISOString(), is_read: false, _pending: true
            }));

            const { path, error } = await uploadChatDocument(selectedConv.id, currentUser.id, file);
            if (error) throw new Error(error);

            const { data, error: sendError } = await sendMessage(selectedConv.id, currentUser.id, file.name, 'document', {
                storage_path: path,
                filename: file.name,
                file_size: file.size,
                mime_type: file.type,
                client_nonce: clientNonce,
                recipientIsActive: Boolean(isOtherOnline),
                suppress_push: Boolean(isOtherOnline)
            });
            if (sendError) throw new Error(sendError);
            if (data) setMessages(prev => mergeMessageList(prev, data));
            addToast('Document sent 📄', 'success');
        } catch (err) {
            console.error('[Chat] Document send error:', err);
            setMessages(prev => prev.filter(m => m.id !== optimisticId));
            addToast('Failed to send document: ' + err.message, 'error');
        } finally {
            setSending(false);
            e.target.value = '';
        }
    };

    const handleStartLiveLocation = async (durationMinutes) => {
        setShowLocationPicker(false);
        if (!canSendLiveLocation(userProfile)) {
            addToast('Live location sharing is an Elite feature. Upgrade to College Date Elite to share your live location.', 'info');
            navigate('/premium');
            return;
        }

        if (!navigator.geolocation) {
            addToast('Geolocation is not supported by your device.', 'error');
            return;
        }

        addToast('Acquiring GPS location...', 'info');
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude, accuracy } = position.coords;
                try {
                    const res = await updateLiveLocation({
                        matchId: selectedConv.id,
                        latitude,
                        longitude,
                        accuracy,
                        durationMinutes
                    });

                    if (!res.success) throw new Error(res.error);

                    const content = `📍 Live Location shared (${durationMinutes} mins)`;
                    const { data, error } = await sendMessage(selectedConv.id, currentUser.id, content, 'location', {
                        live_location_id: res.sessionId,
                        duration_minutes: durationMinutes,
                        latitude,
                        longitude
                    });

                    if (error) throw new Error(error);
                    if (data) setMessages(prev => mergeMessageList(prev, data));

                    // Start high-efficiency periodic GPS watch
                    if (locationWatchCleanupRef.current) locationWatchCleanupRef.current();
                    locationWatchCleanupRef.current = startWatchingPosition(selectedConv.id);

                    // JIT Safety reminder and consent logging
                    recordPolicyAcceptance('safety', '1.0', { feature: 'live_location', match_id: selectedConv.id }).catch(() => {});
                    addToast('Live location shared! 📍 Remember: only share with coursemates you trust.', 'success', 4500);
                } catch (err) {
                    console.error('[Chat] Live location error:', err);
                    addToast(err.message || 'Failed to start live location', 'error');
                }
            },
            (err) => {
                console.error('[Chat] Geolocation error:', err);
                addToast('Could not access GPS. Please ensure location permissions are enabled.', 'error');
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
    };

    const handleOpenViewOnce = async (msg) => {
        try {
            const res = await openViewOnceMedia(msg.id);
            if (res.error) throw new Error(res.error);

            setViewOnceViewerData({
                mediaUrl: res.url,
                mediaType: res.mediaType
            });

            // Optimistic viewed update in local state
            setMessages(prev => prev.map(m => m.id === msg.id ? {
                ...m,
                metadata: { ...m.metadata, is_viewed: true, viewed_at: new Date().toISOString() }
            } : m));
        } catch (err) {
            console.error('[Chat] Open view once error:', err);
            addToast(err.message || 'Could not open media', 'error');
        }
    };

    const handleBlockOtherUser = async () => {
        if (!selectedConv?.other_user?.id) return;
        const name = selectedConv?.other_user?.full_name || 'this user';
        if (!window.confirm(`Are you sure you want to block ${name}? They will no longer be able to message you or see your profile.`)) {
            return;
        }

        try {
            const { success, error } = await blockUser(selectedConv?.other_user?.id);
            if (!success) throw new Error(error);
            setIsBlockedByMe(true);
            setChatMenuOpen(false);
            addToast(`Blocked ${name}.`, 'success');
        } catch (err) {
            addToast(err.message || 'Failed to block user', 'error');
        }
    };

    const handleUnblockOtherUser = async () => {
        if (!selectedConv?.other_user?.id) return;
        const name = selectedConv?.other_user?.full_name || 'user';
        try {
            const { success, error } = await unblockUser(selectedConv?.other_user?.id);
            if (!success) throw new Error(error);
            setIsBlockedByMe(false);
            setChatMenuOpen(false);
            addToast(`Unblocked ${name}.`, 'success');
        } catch (err) {
            addToast(err.message || 'Failed to unblock user', 'error');
        }
    };

    const handleStickerSelect = async (sticker, type) => {
        setShowStickers(false);
        setSending(true);
        const content = type === 'sticker' ? sticker.emoji : sticker;
        const metadata = type === 'sticker' ? { label: sticker.label } : {};

        const optimisticId = `temp-${Date.now()}`;
        const clientNonce = createClientNonce();
        const messageMetadata = { ...metadata, client_nonce: clientNonce };
        setMessages(prev => mergeMessageList(prev, {
            id: optimisticId, match_id: selectedConv?.id, sender_id: currentUser?.id,
            content, type, metadata: messageMetadata, created_at: new Date().toISOString(), is_read: false, _pending: true
        }));

        const { data, error } = await sendMessage(selectedConv?.id, currentUser?.id, content, type, messageMetadata);
        if (error) { setMessages(prev => prev.filter(m => m.id !== optimisticId)); }
        else if (data) { setMessages(prev => mergeMessageList(prev, data)); }
        setSending(false);
    };

    const handleGiftSend = async (gift) => {
        if (!selectedConv?.other_user?.id) { addToast('Recipient ID missing', 'error'); return false; }
        setSending(true);
        try {
            const res = await sendCoinGift(selectedConv?.other_user?.id, gift.id, selectedConv?.id);
            if (!res.success) {
                addToast(res.error || 'Failed to send gift', 'error');
                return false;
            }
            if (res.newCoinBalance !== undefined) setCoinBalance(res.newCoinBalance);
            addToast(`Sent ${gift.name}! 🎁`, 'success');
            return true;
        } catch (err) {
            console.warn('Gift send error:', err);
            addToast('Error sending gift.', 'error');
            return false;
        } finally {
            setSending(false);
        }
    };

    const handleDisappearingChange = async (seconds) => {
        if (!selectedConv?.id || disappearingSaving) return;
        setDisappearingSaving(true);
        const previous = selectedConv?.disappearing_messages_seconds || 0;
        setSelectedConv(prev => prev ? { ...prev, disappearing_messages_seconds: seconds } : prev);
        const { error } = await updateDisappearingMessages(selectedConv.id, seconds);
        if (error) {
            setSelectedConv(prev => prev ? { ...prev, disappearing_messages_seconds: previous } : prev);
            addToast('Could not update disappearing messages.', 'error');
        } else {
            const durationObj = DISAPPEARING_OPTIONS.find(option => option.seconds === seconds);
            const durationLabel = durationObj ? durationObj.label : (seconds ? `${seconds}s` : 'Off');
            // Broadcast system message in conversation
            const systemText = `Disappearing messages set to ${durationLabel}`;
            await sendMessage(selectedConv.id, currentUser?.id, systemText, 'system');

            addToast(seconds ? `Disappearing messages set to ${durationLabel}.` : 'Disappearing messages turned off.', 'success');
            setChatMenuOpen(false);
            revalidateConvs();
        }
        setDisappearingSaving(false);
    };

    // Message Action & Gesture Handlers
    const openMessageActions = (msg, clientX, clientY) => {
        if (!msg || msg.type === 'deleted' || msg.type === 'system') return;
        const el = document.getElementById(`msg-${msg.id}`);
        const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 380;
        const barWidth = 320;
        const rect = el ? el.getBoundingClientRect() : { top: clientY || 150, left: clientX || 20, width: 200, bottom: (clientY || 150) + 40 };

        const safeX = Math.max(12, Math.min(rect.left + rect.width / 2 - barWidth / 2, screenWidth - barWidth - 12));
        const safeY = rect.top > 120 ? rect.top - 62 : rect.bottom + 12;

        setActiveActionMessage(msg);
        setActionMenuPosition({ x: safeX, y: safeY });
    };

    const handleMessageTouchStart = (e, msg) => {
        if (msg._pending || msg.type === 'deleted' || msg.type === 'system') return;
        const touch = e.touches ? e.touches[0] : e;
        touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now(), msgId: msg.id };
        hasVibratedRef.current = false;

        if (longPressTimer.current) clearTimeout(longPressTimer.current);
        longPressTimer.current = setTimeout(() => {
            openMessageActions(msg, touch.clientX, touch.clientY);
        }, 420);
    };

    const handleMessageTouchMove = (e, msgId) => {
        if (!touchStartRef.current || touchStartRef.current.msgId !== msgId || !e.touches?.[0]) return;
        const dx = e.touches[0].clientX - touchStartRef.current.x;
        const dy = e.touches[0].clientY - touchStartRef.current.y;

        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
            if (longPressTimer.current) {
                clearTimeout(longPressTimer.current);
                longPressTimer.current = null;
            }
        }

        // Swipe left gesture
        if (dx < -8 && Math.abs(dx) > Math.abs(dy)) {
            setSwipingMsgId(msgId);
            const clamped = Math.max(-65, dx * 0.55);
            setSwipeOffset(clamped);
            if (clamped <= -42 && !hasVibratedRef.current) {
                hasVibratedRef.current = true;
                if (navigator.vibrate) navigator.vibrate(12);
            }
        }
    };

    const handleMessageTouchEnd = (msg) => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
        if (swipingMsgId === msg.id) {
            if (swipeOffset <= -40) {
                handleActivateReply(msg);
            }
            setSwipingMsgId(null);
            setSwipeOffset(0);
            hasVibratedRef.current = false;
        }
    };

    const handleMessageMouseDown = (e, msg) => {
        if (e.button !== 0 || msg._pending || msg.type === 'deleted' || msg.type === 'system') return;
        touchStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now(), msgId: msg.id };
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
        longPressTimer.current = setTimeout(() => {
            openMessageActions(msg, e.clientX, e.clientY);
        }, 450);
    };

    const handleMessageMouseUp = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };

    const handleActivateReply = (msg) => {
        if (!msg || msg.type === 'deleted' || msg.type === 'system') return;
        let snippet = msg.content;
        if (msg.type === 'image') snippet = '📷 Photo';
        else if (msg.type === 'video') snippet = '🎥 Video';
        else if (msg.type === 'voice') snippet = '🎤 Voice note';
        else if (msg.type === 'document') snippet = `📄 ${msg.metadata?.filename || msg.content || 'Document'}`;
        else if (msg.type === 'location') snippet = '📍 Live location';
        else if (msg.type === 'gift') snippet = '🎁 Gift';
        else if (msg.type === 'sticker') snippet = '✨ Sticker';

        const senderName = msg.sender_id === currentUser?.id ? 'You' : (selectedConv?.other_user?.full_name || 'User');
        setReplyToMessage({
            id: msg.id,
            sender: senderName,
            content: snippet,
            type: msg.type || 'text'
        });
        setEditingMessage(null);
        setTimeout(() => {
            chatInputRef.current?.focus();
        }, 60);
    };

    const handleScrollToQuotedMessage = (replyToId) => {
        if (!replyToId) return;
        const targetEl = document.getElementById(`msg-${replyToId}`);
        if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setHighlightedMessageId(replyToId);
            setTimeout(() => setHighlightedMessageId(null), 1500);
            return;
        }
        const idx = messages.findIndex(m => m.id === replyToId);
        if (idx >= 0 && virtuosoRef.current) {
            virtuosoRef.current.scrollToIndex({ index: idx, align: 'center', behavior: 'smooth' });
            setHighlightedMessageId(replyToId);
            setTimeout(() => setHighlightedMessageId(null), 1500);
        }
    };

    const handleReact = async (emoji, targetMsgId = null) => {
        const msgId = targetMsgId || activeActionMessage?.id;
        if (!msgId) return;

        // Optimistic local update
        setMessages(prev => prev.map(m => {
            if (m.id !== msgId) return m;
            const reactions = { ...(m.metadata?.reactions || {}) };
            const existing = reactions[emoji] || [];
            if (existing.includes(currentUser.id)) {
                reactions[emoji] = existing.filter(id => id !== currentUser.id);
                if (!reactions[emoji].length) delete reactions[emoji];
            } else {
                Object.keys(reactions).forEach(k => {
                    reactions[k] = reactions[k].filter(id => id !== currentUser.id);
                    if (!reactions[k].length) delete reactions[k];
                });
                reactions[emoji] = [...(reactions[emoji] || []), currentUser.id];
            }
            return { ...m, metadata: { ...m.metadata, reactions } };
        }));

        if (activeActionMessage) {
            setActiveActionMessage(null);
            setActionMenuPosition(null);
        }
        await addReaction(msgId, emoji, currentUser.id);
    };

    const handleStartEdit = (msg) => {
        if (!msg) return;
        setEditingMessage(msg);
        setNewMessage(msg.content);
        setReplyToMessage(null);
        setActiveActionMessage(null);
        setActionMenuPosition(null);
        setTimeout(() => {
            chatInputRef.current?.focus();
        }, 60);
    };

    const handleDeleteForMe = async (msg) => {
        if (!msg?.id) return;
        setMessages(prev => prev.filter(m => m.id !== msg.id));
        if (String(msg.id).startsWith('temp-')) {
            const nonce = msg.metadata?.client_nonce;
            if (nonce && currentUser?.id) {
                removeOfflineOperation(currentUser.id, `send_message:${nonce}`);
            }
            addToast('Message removed', 'info');
            return;
        }
        const { error } = await deleteMessageForMe(msg.id);
        if (error) {
            addToast(`Could not delete message: ${error}`, 'error');
        } else {
            addToast('Message deleted for you', 'info');
        }
    };

    const handleDeleteForEveryone = async (msg) => {
        if (!msg?.id) return;
        if (String(msg.id).startsWith('temp-')) {
            setMessages(prev => prev.filter(m => m.id !== msg.id));
            const nonce = msg.metadata?.client_nonce;
            if (nonce && currentUser?.id) {
                removeOfflineOperation(currentUser.id, `send_message:${nonce}`);
            }
            addToast('Pending message cancelled', 'info');
            return;
        }

        // Optimistic update
        setMessages(prev => prev.map(m => m.id === msg.id ? {
            ...m,
            type: 'deleted',
            content: 'This message was deleted',
            metadata: { ...m.metadata, is_deleted: true, deleted_at: new Date().toISOString() }
        } : m));

        const { error } = await deleteMessageForEveryone(msg.id);
        if (error) {
            addToast(`Could not delete for everyone: ${error}`, 'error');
            if (selectedConv?.id) loadMessages(selectedConv.id, 0, false);
        } else {
            addToast('Message deleted for everyone', 'info');
        }
    };

    // Backward-compatible alias
    const handleDelete = async (msg) => {
        handleDeleteForEveryone(msg);
    };

    const renderMessageContent = (msg) => {
        switch (msg.type) {
            case 'deleted':
                return <div className="message-content-text message-content-deleted"><em>This message was deleted</em></div>;
            case 'system':
                return <div className="message-system-pill">ℹ️ {msg.content}</div>;
            case 'voice': return <ChatMedia msg={msg} type="voice" isSent={msg.sender_id === currentUser.id} />;
            case 'image': return <ChatMedia msg={msg} type="image" isSent={msg.sender_id === currentUser.id} />;
            case 'video': return <ChatMedia msg={msg} type="video" isSent={msg.sender_id === currentUser.id} />;
            case 'document': {
                const filename = msg.metadata?.filename || msg.content || 'Document';
                const fileSize = msg.metadata?.file_size ? `${(msg.metadata.file_size / (1024 * 1024)).toFixed(1)} MB` : '';
                const ext = (filename.split('.').pop() || 'FILE').toUpperCase();
                return (
                    <div className="document-bubble-item">
                        <div className="doc-icon-badge">📄</div>
                        <div className="doc-info-col">
                            <span className="doc-name" title={filename}>{filename}</span>
                            <span className="doc-meta-sub">{ext} • {fileSize}</span>
                        </div>
                        <button
                            type="button"
                            className="btn-download-doc"
                            onClick={async (e) => {
                                e.stopPropagation();
                                const path = msg.metadata?.storage_path || msg.content;
                                const { url } = await getSignedChatMediaUrl(path, 3600);
                                if (url) window.open(url, '_blank');
                                else addToast('Could not open document', 'error');
                            }}
                            title="Download document"
                        >
                            ⬇️
                        </button>
                    </div>
                );
            }
            case 'view_once': {
                const isViewed = Boolean(msg.metadata?.is_viewed);
                const isMe = msg.sender_id === currentUser.id;
                const mediaTypeLabel = msg.metadata?.media_type === 'video' ? 'Video' : 'Photo';

                if (isViewed) {
                    return (
                        <div className="view-once-bubble-viewed">
                            <span className="view-once-badge-circle viewed">①</span>
                            <span className="view-once-text-opened">{mediaTypeLabel} • Opened</span>
                        </div>
                    );
                }

                if (isMe) {
                    return (
                        <div className="view-once-bubble-sent">
                            <span className="view-once-badge-circle">①</span>
                            <span className="view-once-text-sent">{mediaTypeLabel} (View Once)</span>
                        </div>
                    );
                }

                return (
                    <div className="view-once-bubble-unopened" onClick={() => handleOpenViewOnce(msg)}>
                        <span className="view-once-badge-circle interactive pulse">①</span>
                        <div className="view-once-action-col">
                            <span className="view-once-title-unopened">{mediaTypeLabel}</span>
                            <span className="view-once-hint">Tap to view once ⏱️</span>
                        </div>
                    </div>
                );
            }
            case 'location':
                return (
                    <LiveLocationCard
                        matchId={selectedConv?.id}
                        message={msg}
                        currentUserId={currentUser.id}
                        isSender={msg.sender_id === currentUser.id}
                    />
                );
            case 'service_deal':
                return (
                    <ServiceDealCard
                        dealId={msg.metadata?.deal_id}
                        currentUserId={currentUser.id}
                        onDealUpdated={() => {
                            revalidateConvs();
                        }}
                    />
                );
            case 'mini_game':
                return (
                    <ChatMiniGameCard
                        message={msg}
                        currentUserId={currentUser.id}
                        currentUserName={userProfile?.full_name?.split(' ')[0] || 'Your match'}
                        partnerName={selectedConv?.other_user?.full_name?.split(' ')[0] || 'Peer'}
                        isSender={msg.sender_id === currentUser.id}
                    />
                );
            case 'sticker': return <div className="sticker-message"><span className="sticker-emoji-large">{msg.content}</span><span className="sticker-label">{msg.metadata?.label}</span></div>;
            case 'gift': {
                const giftId = msg.metadata?.gift_id || 'rose';
                const giftPreset = VIRTUAL_GIFTS.find(g => g.id === giftId) || VIRTUAL_GIFTS[0];
                const giftName = msg.metadata?.name || msg.metadata?.gift_name || giftPreset.name;
                const emoji = msg.metadata?.gift_emoji || giftPreset.emoji || (msg.content?.includes(' ') ? '🎁' : msg.content);
                const coins = msg.metadata?.gift_coins || msg.metadata?.coins || giftPreset.coins;
                const creditNgn = msg.metadata?.earning_credit_ngn ?? giftPreset.earningCreditNgn ?? (coins * 8);
                const giftColor = msg.metadata?.gift_color || giftPreset.color || '#f43f5e';
                const isLion = giftId === 'lion';
                const isSentByMe = msg.sender_id === currentUser.id;

                const handleReplay = (e) => {
                    e.stopPropagation();
                    const giftData = {
                        id: giftId,
                        name: giftName,
                        emoji,
                        coins,
                        color: giftColor,
                        desc: giftPreset.desc,
                        earningCreditNgn: creditNgn,
                        matchId: selectedConv?.id
                    };
                    const senderData = isSentByMe ? {
                        id: currentUser.id,
                        name: 'You',
                        avatar_url: userProfile?.avatar_url
                    } : {
                        id: selectedConv?.other_user?.id,
                        name: selectedConv?.other_user?.full_name || selectedConv?.other_user?.name || 'Someone Special',
                        avatar_url: selectedConv?.other_user?.avatar_url || selectedConv?.other_user?.avatar
                    };
                    triggerGiftCelebration?.(giftData, senderData);
                };

                return (
                    <div
                        className={`gift-message interactive-gift-card ${isLion ? 'lion-card' : ''}`}
                        onClick={handleReplay}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleReplay(e); } }}
                        title="Click to replay celebration animation"
                        style={{ '--card-theme-color': giftColor }}
                    >
                        <div className="gift-card-glow" />
                        <div className="gift-card-header">
                            <span className="gift-card-badge">{isLion ? '👑 LEGENDARY GIFT' : '🎁 VIRTUAL GIFT'}</span>
                        </div>
                        <div className="gift-card-emoji-wrap">
                            <span className="gift-emoji-large">{emoji}</span>
                        </div>
                        <div className="gift-card-body">
                            <span className="gift-label">{giftName}</span>
                            <div className="gift-card-chips">
                                <span className="chip-coins">🪙 {coins.toLocaleString()} Coins</span>
                                {creditNgn > 0 && !isSentByMe && (
                                    <span className="chip-earnings">+₦{creditNgn.toLocaleString()}</span>
                                )}
                            </div>
                        </div>
                        <button
                            type="button"
                            className="btn-replay-gift"
                            onClick={handleReplay}
                            aria-label={`Replay ${giftName} celebration`}
                        >
                            <span>✨ Replay Animation</span>
                        </button>
                    </div>
                );
            }
            case 'emoji': return <span className="emoji-message-large">{msg.content}</span>;
            case 'call_log': {
                const isRecent = (Date.now() - new Date(msg.created_at).getTime()) < (10 * 60 * 1000); // 10 mins
                const isMe = msg.sender_id === currentUser.id;
                const callType = msg.metadata?.callType || 'voice';

                return (
                    <div className="call-log-bubble">
                        <div className="call-log-header">
                            <span className="call-log-icon">{callType === 'video' ? '📹' : '📞'}</span>
                            <div className="call-log-details">
                                <span className="call-log-title">{callType === 'video' ? 'Video Call' : 'Voice Call'}</span>
                                <span className="call-log-time">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        </div>
                        {isRecent && !isMe ? (
                            <button 
                                className="btn-join-call" 
                                onClick={() => navigate(`/call/${msg.match_id}?type=${callType}&name=${encodeURIComponent(selectedConv?.other_user?.full_name || 'User')}`)}
                            >
                                Join Call
                            </button>
                        ) : (
                            <span className="call-status-tag">{isMe ? 'Call Started' : 'Call ended'}</span>
                        )}
                    </div>
                );
            }
            default: {
                const match = typeof msg.content === 'string' && msg.content.match(/^\[Replied to ([^\]]+)\]:\s*"?([\s\S]*?)"?$/);
                if (match) {
                    const promptCategory = match[1];
                    const replyText = match[2];
                    return (
                        <div className="message-content-text message-prompt-reply-wrap">
                            <div className="chat-prompt-reply-quote">
                                <span className="chat-prompt-reply-tag">✈ Replied to {promptCategory}</span>
                            </div>
                            <div className="chat-prompt-reply-body">{replyText}</div>
                        </div>
                    );
                }
                return <div className="message-content-text">{msg.content}</div>;
            }
        }
    };

    const renderReactions = (msg) => {
        const reactions = msg.metadata?.reactions;
        if (!reactions || Object.keys(reactions).length === 0) return null;
        return (
            <div className="reaction-pills">
                {Object.entries(reactions).map(([emoji, users]) => (
                    <span
                        key={emoji}
                        className={`reaction-pill ${users.includes(currentUser.id) ? 'mine' : ''}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleReact(emoji, msg.id);
                        }}
                    >
                        {emoji} <span>{users.length}</span>
                    </span>
                ))}
            </div>
        );
    };

    // ── Disappearing Options Label ─────────────────────────────────────
    const activeDisappearingSeconds = selectedConv?.disappearing_messages_seconds || 0;
    const activeDisappearingLabel = DISAPPEARING_OPTIONS.find(option => option.seconds === activeDisappearingSeconds)?.label || 'Custom';

    // Derived filtered conversations list
    const filteredConvs = (conversations || []).filter(conv => {
        if (!conv) return false;
        const matchesSearch = searchQuery.trim() === '' ||
            (conv.other_user?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (conv.last_message || '').toLowerCase().includes(searchQuery.toLowerCase());

        if (filterTab === 'Unread') {
            return matchesSearch && conv.has_unread;
        }
        if (filterTab === 'Online') {
            return matchesSearch && (presence[conv.other_user?.id]?.length || 0) > 0;
        }
        if (filterTab === 'Matches') {
            return matchesSearch && (!conv.last_message || conv.last_message_type === null);
        }
        return matchesSearch;
    });

    return (
        <div className="chat-page">
            {showGifts && (
                <GiftStore
                    onClose={() => setShowGifts(false)}
                    onSend={handleGiftSend}
                    coinBalance={coinBalance}
                    onOpenCoinStore={() => setShowCoinStore(true)}
                />
            )}
            {showCoinStore && (
                <CoinStoreModal
                    userCoins={coinBalance}
                    walletBalance={walletBalance}
                    onClose={() => setShowCoinStore(false)}
                    onCoinsUpdated={(newBal) => setCoinBalance(newBal)}
                />
            )}
            {showReportModal && (
                <ReportModal
                    targetUser={selectedConv?.other_user}
                    contextType="chat"
                    contextId={selectedConv?.id}
                    onClose={() => setShowReportModal(false)}
                    onReportSuccess={({ alsoBlocked }) => {
                        if (alsoBlocked) setIsBlockedByMe(true);
                    }}
                />
            )}
            {showDealModal && (
                <CreateServiceDealModal
                    matchId={selectedConv?.id}
                    otherUser={selectedConv?.other_user}
                    currentUserId={currentUser?.id}
                    onClose={() => setShowDealModal(false)}
                    onDealCreated={() => {
                        revalidateConvs();
                    }}
                />
            )}

            {showMiniGameModal && (
                <ChatMiniGameModal
                    isOpen={showMiniGameModal}
                    onClose={() => setShowMiniGameModal(false)}
                    onSendGame={handleSendMiniGame}
                    partnerName={selectedConv?.other_user?.full_name?.split(' ')[0] || 'your match'}
                />
            )}
            {viewOnceViewerData && (
                <ViewOnceViewerModal
                    mediaUrl={viewOnceViewerData.mediaUrl}
                    mediaType={viewOnceViewerData.mediaType}
                    onClose={() => setViewOnceViewerData(null)}
                />
            )}
            {pendingMediaUpload && (
                <div className="media-preview-modal-overlay animate-fade-in" onClick={() => setPendingMediaUpload(null)}>
                    <div className="media-preview-modal-card glass" onClick={e => e.stopPropagation()}>
                        <div className="media-preview-header">
                            <span className="preview-title">Preview {pendingMediaUpload.mediaType === 'video' ? 'Video' : 'Photo'}</span>
                            <button type="button" className="btn-close-preview" onClick={() => setPendingMediaUpload(null)}>&times;</button>
                        </div>
                        <div className="media-preview-display">
                            {pendingMediaUpload.mediaType === 'video' ? (
                                <video src={pendingMediaUpload.previewUrl} controls autoPlay playsInline className="preview-media-player" />
                            ) : (
                                <img src={pendingMediaUpload.previewUrl} alt="Preview" className="preview-media-image" />
                            )}
                        </div>
                        <div className="media-preview-footer">
                            <button
                                type="button"
                                className={`btn-view-once-toggle ${pendingMediaUpload.isViewOnce ? 'active' : ''}`}
                                onClick={() => setPendingMediaUpload(prev => ({ ...prev, isViewOnce: !prev.isViewOnce }))}
                                title={pendingMediaUpload.isViewOnce ? "View Once activated: Recipient can view only once" : "Tap to send as View Once"}
                            >
                                <span className="view-once-circle-icon">①</span>
                                <span className="view-once-pill-text">{pendingMediaUpload.isViewOnce ? 'View Once ON' : 'View Once OFF'}</span>
                            </button>
                            <div className="preview-actions-row">
                                <button type="button" className="btn-cancel-media" onClick={() => setPendingMediaUpload(null)}>
                                    Cancel
                                </button>
                                <button type="button" className="btn-send-media" onClick={handleConfirmMediaSend} disabled={sending}>
                                    {sending ? 'Sending...' : 'Send ➔'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {showLocationPicker && (
                <div className="location-picker-overlay animate-fade-in" onClick={() => setShowLocationPicker(false)}>
                    <div className="location-picker-card glass" onClick={e => e.stopPropagation()}>
                        <div className="location-picker-header">
                            <div className="loc-icon-badge">📍</div>
                            <div className="loc-header-text">
                                <h3>Share Live Location</h3>
                                <p>Participants in this chat will see your live GPS updates on a map</p>
                            </div>
                            <button type="button" className="btn-close-loc" onClick={() => setShowLocationPicker(false)}>&times;</button>
                        </div>
                        <div className="location-duration-options">
                            <button type="button" className="duration-btn" onClick={() => handleStartLiveLocation(15)}>
                                ⏱️ 15 Minutes
                            </button>
                            <button type="button" className="duration-btn recommended" onClick={() => handleStartLiveLocation(30)}>
                                ⏱️ 30 Minutes (Recommended)
                            </button>
                            <button type="button" className="duration-btn" onClick={() => handleStartLiveLocation(60)}>
                                ⏱️ 1 Hour
                            </button>
                        </div>
                        <p className="location-disclaimer">
                            🔒 Battery-conscious throttled GPS updates • Stop sharing anytime directly from the chat card.
                        </p>
                    </div>
                </div>
            )}

            <div ref={sidebarRef} className={`chat-sidebar ${selectedConv ? 'hide' : 'show'}`}>
                <div className="chat-sidebar-header">
                    <h1>Messages</h1>
                </div>

                {isOffline && (
                    <div className="chat-offline-banner-pill" role="status">
                        <span className="offline-dot" />
                        <span>Offline • Messages queued</span>
                    </div>
                )}

                <ContextualTip
                    featureId="messages_chat"
                    className="chat-contextual-tip"
                    onLearnMore={() => setGuideModalOpen(true)}
                />

                {/* Sidebar Search Row */}
                <div className="chat-sidebar-search-row">
                    <div className="chat-search-input-container">
                        <span className="search-icon-glass-chat">🔍</span>
                        <input
                            type="text"
                            placeholder="Search direct messages..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="chat-search-input"
                        />
                        {searchQuery && (
                            <button className="chat-search-clear" onClick={() => setSearchQuery('')}>×</button>
                        )}
                    </div>
                </div>

                {/* Sidebar Filter Chips */}
                <div className="chat-filter-chips-container">
                    {['All', 'Unread', 'Online', 'Matches'].map(tab => (
                        <button
                            key={tab}
                            className={`chat-filter-chip ${filterTab === tab ? 'active' : ''}`}
                            onClick={() => setFilterTab(tab)}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Sidebar Activity & Requests scroll row */}
                <div className="chat-activity-requests-row">
                    <RequestsDiscoveryHighlight
                        isActive={isRequestsDiscoveryEligible}
                        hasRequests={discoveryCopy.hasRequests}
                        cue={discoveryCopy.cue}
                        onClick={handleRequestsEntryClick}
                        className="activity-circle likes-circle"
                    >
                        <div className={`activity-avatar-frame ${!userProfile?.is_premium ? 'blurred' : ''}`}>
                            <span className="activity-emoji">❤️</span>
                            {likesCount > 0 && <span className="activity-badge">{likesCount}</span>}
                        </div>
                        <span className="activity-label">
                            {isRequestsDiscoveryEligible && discoveryCopy.hasRequests ? 'Accept' : 'Likes'}
                        </span>
                    </RequestsDiscoveryHighlight>

                    <div className="activity-circle views-circle" onClick={() => navigate('/viewers')}>
                        <div className={`activity-avatar-frame ${!userProfile?.is_premium ? 'blurred' : ''}`}>
                            <span className="activity-emoji">👀</span>
                            {viewsCount > 0 && <span className="activity-badge">{viewsCount}</span>}
                        </div>
                        <span className="activity-label">Views</span>
                    </div>

                    {pendingRequestsList.map(req => {
                        const swiper = req.swiper;
                        if (!swiper) return null;
                        return (
                            <div key={req.id} className="activity-circle request-item" onClick={() => navigate('/requests')}>
                                <div className="activity-avatar-frame">
                                    <img src={getAvatarUrl(swiper) || swiper.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${swiper.id}`} alt="" />
                                    <span className="request-badge-dot">●</span>
                                </div>
                                <span className="activity-label">{swiper.full_name?.split(' ')[0]}</span>
                            </div>
                        );
                    })}
                </div>

                <div className="conversation-list">
                    {/* Official The College Date Verified Educational Hub Card */}
                    <OfficialChannelCard onClick={() => setOfficialHubOpen(true)} />

                    {convsLoading && conversations.length === 0 ? (
                        <div className="conversation-skeleton-list" aria-label="Loading conversations" role="status">
                            {[1, 2, 3, 4, 5].map((idx) => (
                                <div key={idx} className="conv-skeleton-row shimmer">
                                    <div className="conv-skeleton-avatar" />
                                    <div className="conv-skeleton-content">
                                        <div className="conv-skeleton-top">
                                            <div className="conv-skeleton-name" />
                                            <div className="conv-skeleton-time" />
                                        </div>
                                        <div className="conv-skeleton-msg" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filteredConvs.length === 0 ? (
                        <div className="chat-empty-state"><p>No messages found.</p></div>
                    ) : (
                        filteredConvs.map((conv) => {
                            const isTypingNow = presence[conv.other_user?.id]?.some(p => p.is_typing);
                            const isOnline = (presence[conv.other_user?.id]?.length || 0) > 0;
                            const isSentByMe = conv.last_message_sender_id === currentUser?.id;
                            const hasUnread = conv.has_unread && selectedConv?.id !== conv.id;
                            const isMuted = mutedConvs.includes(conv.id);
                            const isSwiped = swipedConvId === conv.id;
                            const typePrefix = conv.last_message_type === 'voice' ? '🎙️ ' : conv.last_message_type === 'gift' ? '🎁 ' : conv.last_message_type === 'sticker' ? '😊 ' : '';
                            return (
                                <div key={conv.id} className="conversation-row-wrapper">
                                    {/* Left swipe actions (revealed when swiped right) */}
                                    <div
                                        className="conv-swipe-actions-left"
                                        style={{ visibility: isSwiped && swipedOffset > 0 ? 'visible' : 'hidden' }}
                                    >
                                        <button
                                            type="button"
                                            className="conv-swipe-btn read"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleToggleConvRead(conv);
                                                setSwipedConvId(null);
                                                setSwipedOffset(0);
                                            }}
                                            aria-label={conv.has_unread ? "Mark as read" : "Mark as unread"}
                                        >
                                            <span>{conv.has_unread ? '📬' : '✉️'}</span>
                                            <span>{conv.has_unread ? 'Read' : 'Unread'}</span>
                                        </button>
                                    </div>

                                    {/* Right swipe actions (revealed when swiped left) */}
                                    <div
                                        className="conv-swipe-actions-right"
                                        style={{ visibility: isSwiped && swipedOffset < 0 ? 'visible' : 'hidden' }}
                                    >
                                        <button
                                            type="button"
                                            className="conv-swipe-btn more"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setContextConv(conv);
                                                setSwipedConvId(null);
                                                setSwipedOffset(0);
                                            }}
                                            aria-label="More conversation options"
                                        >
                                            <span>⋯</span>
                                            <span>More</span>
                                        </button>
                                        <button
                                            type="button"
                                            className="conv-swipe-btn delete"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setContextConv(conv);
                                                setSwipedConvId(null);
                                                setSwipedOffset(0);
                                            }}
                                            aria-label="Delete conversation"
                                        >
                                            <span>🗑️</span>
                                            <span>Delete</span>
                                        </button>
                                    </div>

                                    <div
                                        className={`conversation-item ${selectedConv?.id === conv.id ? 'active' : ''} ${hasUnread ? 'unread' : ''}`}
                                        style={isSwiped ? { transform: `translateX(${swipedOffset}px)` } : undefined}
                                        onTouchStart={(e) => handleConvTouchStart(e, conv)}
                                        onTouchMove={(e) => handleConvTouchMove(e, conv)}
                                        onTouchEnd={(e) => handleConvTouchEnd(e, conv)}
                                        onTouchCancel={() => {
                                            if (convLongPressTimerRef.current) clearTimeout(convLongPressTimerRef.current);
                                        }}
                                        onContextMenu={(e) => {
                                            e.preventDefault();
                                            triggerLightHaptic();
                                            setContextConv(conv);
                                        }}
                                        onClick={() => {
                                            if (swipedConvId) {
                                                setSwipedConvId(null);
                                                setSwipedOffset(0);
                                            } else {
                                                handleSelectConversation(conv);
                                            }
                                        }}
                                    >
                                        <div
                                            className={`avatar-wrapper ${usersWithStatus.has(conv.other_user?.id) ? (usersWithUnviewedStatus.has(conv.other_user?.id) ? 'has-active-status' : 'has-viewed-status') : ''}`}
                                            onClick={(e) => handleAvatarClick(conv.other_user, e, conv.id)}
                                        >
                                            <img src={getAvatarUrl(conv.other_user) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${conv.id}`} alt="" className="conv-avatar" />
                                            {usersWithStatus.has(conv.other_user?.id) && (
                                                <span
                                                    className={`status-story-indicator ${usersWithUnviewedStatus.has(conv.other_user?.id) ? 'is-unviewed' : 'is-viewed'}`}
                                                    title={usersWithUnviewedStatus.has(conv.other_user?.id) ? 'New Campus Story' : 'Viewed Campus Story'}
                                                />
                                            )}
                                            {isOnline && <span className="online-dot" />}
                                            {hasActivePremium(conv.other_user) && (
                                                <span className="chat-avatar-premium-badge" title="Premium Member">👑</span>
                                            )}
                                        </div>
                                        <div className="conv-info">
                                            <div className="conv-name-row">
                                                <span className={`conv-name ${hasUnread ? 'bold' : ''}`}>
                                                    {conv.other_user?.full_name || 'User'}
                                                    {isMuted && <span className="conv-muted-icon" title="Notifications muted"> 🔕</span>}
                                                    {hasActivePremium(conv.other_user) && <span className="premium-crown" title="Premium Member">👑</span>}
                                                    {(conv.other_user?.is_verified || conv.other_user?.photo_verified) && (
                                                        <span className="card-verified-tick" title="Photo Verified Student">✓</span>
                                                    )}
                                                </span>
                                                <span className="conv-time">{formatSidebarTimestamp(conv.last_message_at)}</span>
                                            </div>
                                            <div className="conv-last-msg">
                                                {isTypingNow ? <span className="typing-text">typing...</span> : <span className={`msg-snippet ${hasUnread ? 'unread-text' : ''} ${isMuted ? 'muted' : ''}`}>{isSentByMe ? 'You: ' : ''}{typePrefix}{conv.last_message || 'Say hi 👋'}</span>}
                                            </div>
                                        </div>
                                        <div className="conv-meta-right">
                                            {hasUnread && (
                                                <span className="conv-unread-pill">
                                                    {conv.unread_count > 99 ? '99+' : (conv.unread_count || 1)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            <div className={`chat-window ${!selectedConv ? 'hide-mobile' : 'show'}`}>
                {selectedConv ? (
                    <>
                        {activeActionMessage && (
                            <MessageActionMenu
                                message={activeActionMessage}
                                isSentByMe={activeActionMessage.sender_id === currentUser?.id}
                                position={actionMenuPosition}
                                onReact={(emoji) => handleReact(emoji, activeActionMessage.id)}
                                onEdit={() => handleStartEdit(activeActionMessage)}
                                onInfo={() => setInfoTargetMessage(activeActionMessage)}
                                onDelete={() => setDeleteTargetMessage(activeActionMessage)}
                                onClose={() => {
                                    setActiveActionMessage(null);
                                    setActionMenuPosition(null);
                                }}
                            />
                        )}

                        {deleteTargetMessage && (
                            <MessageDeleteModal
                                message={deleteTargetMessage}
                                isSentByMe={deleteTargetMessage.sender_id === currentUser?.id}
                                onDeleteForMe={(msg) => handleDeleteForMe(msg)}
                                onDeleteForEveryone={(msg) => handleDeleteForEveryone(msg)}
                                onClose={() => setDeleteTargetMessage(null)}
                            />
                        )}

                        {infoTargetMessage && (
                            <MessageInfoModal
                                message={infoTargetMessage}
                                onClose={() => setInfoTargetMessage(null)}
                            />
                        )}
                        <div className="chat-header">
                            <button className="back-btn" onClick={handleCloseConversation} aria-label="Back to messages">←</button>
                            <div className="header-info" onClick={(e) => handleAvatarClick(selectedConv?.other_user, e, selectedConv?.id)}>
                                <div className={`header-avatar-container ${usersWithStatus.has(selectedConv?.other_user?.id) ? (usersWithUnviewedStatus.has(selectedConv?.other_user?.id) ? 'has-active-status' : 'has-viewed-status') : ''}`}>
                                    <img src={getAvatarUrl(selectedConv?.other_user) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedConv?.id || 'chat'}`} alt="" className="header-avatar" />
                                    {usersWithStatus.has(selectedConv?.other_user?.id) && (
                                        <span
                                            className={`status-story-indicator ${usersWithUnviewedStatus.has(selectedConv?.other_user?.id) ? 'is-unviewed' : 'is-viewed'}`}
                                            title={usersWithUnviewedStatus.has(selectedConv?.other_user?.id) ? 'New Campus Story' : 'Viewed Campus Story'}
                                        />
                                    )}
                                    {isOtherOnline && <span className="online-dot-large" />}
                                    {hasActivePremium(selectedConv?.other_user) && (
                                        <span className="chat-header-premium-badge" title="Premium Member">👑</span>
                                    )}
                                </div>
                                <div className="header-text">
                                    <span className="header-name">
                                        {selectedConv?.other_user?.full_name || 'Chat'}
                                        {hasActivePremium(selectedConv?.other_user) && <span className="premium-badge-pill-chat" title="Premium Member">👑 Premium</span>}
                                        {(selectedConv?.other_user?.is_verified || selectedConv?.other_user?.photo_verified) && (
                                            <span className="card-verified-tick" title="Photo Verified Student">✓</span>
                                        )}
                                    </span>
                                    <span className={`status-text ${isOtherOnline ? 'online' : ''}`}>{isOtherTyping ? 'typing...' : isOtherOnline ? 'Online' : (selectedConv?.other_user?.last_seen_at ? formatChatTimestamp(selectedConv?.other_user?.last_seen_at) : 'Offline')}</span>
                                </div>
                            </div>
                            <div className="chat-header-actions" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
                                {(callChoiceOpen || chatMenuOpen) && (
                                    <div 
                                        className="chat-popover-backdrop" 
                                        onClick={() => {
                                            setCallChoiceOpen(false);
                                            setChatMenuOpen(false);
                                        }} 
                                    />
                                )}
                                <button
                                    type="button"
                                    className="chat-header-coin-pill"
                                    onClick={() => setShowCoinStore(true)}
                                    title="CD Coins - Tap to view store"
                                >
                                    🪙 <span>{coinBalance.toLocaleString()}</span>
                                </button>
                                <button 
                                    type="button"
                                    className={`btn-call ${callChoiceOpen ? 'active' : ''}`} 
                                    onClick={() => {
                                        setChatMenuOpen(false);
                                        setCallChoiceOpen(open => !open);
                                    }} 
                                    title="Call Options"
                                    aria-label="Call Options"
                                >
                                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                    </svg>
                                </button>

                                {callChoiceOpen && (
                                    <div className="call-selection-popover">
                                        <button className="call-option" type="button" onClick={() => initiateCall('voice')}>
                                            <span className="option-icon">📞</span>
                                            <div className="option-text">
                                                <strong>Voice Call</strong>
                                                <span>Audio only connection</span>
                                            </div>
                                        </button>
                                        <button className="call-option video" type="button" onClick={() => initiateCall('video')}>
                                            <span className="option-icon">📹</span>
                                            <div className="option-text">
                                                <strong>Video Call</strong>
                                                <span>Face-to-face hangout</span>
                                            </div>
                                        </button>
                                        <div className="call-selection-arrow"></div>
                                    </div>
                                )}
                                <button
                                    className={`btn-chat-menu ${chatMenuOpen ? 'active' : ''}`}
                                    type="button"
                                    onClick={() => {
                                        setCallChoiceOpen(false);
                                        setChatMenuOpen(open => !open);
                                    }}
                                    title="Disappearing Messages & Settings"
                                    aria-label="Disappearing Messages & Settings"
                                >
                                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="1" />
                                        <circle cx="19" cy="12" r="1" />
                                        <circle cx="5" cy="12" r="1" />
                                    </svg>
                                </button>

                                {chatMenuOpen && (
                                    <div className="chat-settings-popover">
                                        <div className="chat-settings-header">
                                            <div className="chat-settings-title">⏳ Disappearing Messages</div>
                                            <p className="chat-settings-sub">Set timer for new messages to self-destruct</p>
                                        </div>
                                        <div className="disappearing-options">
                                            {DISAPPEARING_OPTIONS.map(option => (
                                                <button
                                                    key={option.seconds}
                                                    type="button"
                                                    className={activeDisappearingSeconds === option.seconds ? 'selected' : ''}
                                                    onClick={() => handleDisappearingChange(option.seconds)}
                                                    disabled={disappearingSaving}
                                                >
                                                    <span>{option.label}</span>
                                                    {activeDisappearingSeconds === option.seconds && (
                                                        <span className="selected-check">✓</span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="chat-settings-divider" />
                                        <div className="chat-safety-actions">
                                            <button
                                                type="button"
                                                className="chat-safety-menu-item report"
                                                onClick={() => {
                                                    setChatMenuOpen(false);
                                                    setShowReportModal(true);
                                                }}
                                            >
                                                <span>🚩</span> Report {selectedConv?.other_user?.full_name?.split(' ')[0] || 'User'}
                                            </button>
                                            <button
                                                type="button"
                                                className="chat-safety-menu-item block"
                                                onClick={isBlockedByMe ? handleUnblockOtherUser : handleBlockOtherUser}
                                            >
                                                <span>🚫</span> {isBlockedByMe ? 'Unblock User' : `Block ${selectedConv?.other_user?.full_name?.split(' ')[0] || 'User'}`}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {isOffline && (
                            <div className="chat-offline-banner-pill" role="status">
                                <span className="offline-dot" />
                                <span>Offline Mode • Messages will send when connected</span>
                            </div>
                        )}

                        {!safetyNoticeDismissed && !isUltra && (
                            <div className="chat-safety-reminder-bar animate-fade-in" role="note">
                                <span className="safety-bar-shield">🛡️</span>
                                <span className="safety-bar-text">
                                    <strong>Campus Safety:</strong> Keep chats on TheCollegeDate. Built-in Voice Notes & HD Video Calls protect your privacy.
                                </span>
                                <button
                                    type="button"
                                    className="safety-bar-dismiss"
                                    onClick={dismissSafetyNotice}
                                    title="Dismiss notice"
                                    aria-label="Dismiss notice"
                                >
                                    ✕
                                </button>
                            </div>
                        )}

                        <div className="messages-container">
                            {activeDisappearingSeconds > 0 && (
                                <div className="disappearing-notice">
                                    Messages in this chat disappear after {activeDisappearingLabel.toLowerCase()}.
                                </div>
                            )}
                            {messagesLoading && messages.length === 0 ? (
                                <div className="chat-bubbles-skeleton" aria-label="Loading messages" role="status">
                                    <div className="chat-bubble-skeleton-item incoming">
                                        <div className="bubble-skeleton shimmer">
                                            <div className="bubble-skeleton-line" />
                                            <div className="bubble-skeleton-line short" />
                                        </div>
                                    </div>
                                    <div className="chat-bubble-skeleton-item outgoing">
                                        <div className="bubble-skeleton shimmer">
                                            <div className="bubble-skeleton-line" />
                                        </div>
                                    </div>
                                    <div className="chat-bubble-skeleton-item incoming">
                                        <div className="bubble-skeleton shimmer">
                                            <div className="bubble-skeleton-line" />
                                        </div>
                                    </div>
                                    <div className="chat-bubble-skeleton-item outgoing">
                                        <div className="bubble-skeleton shimmer">
                                            <div className="bubble-skeleton-line" />
                                            <div className="bubble-skeleton-line short" />
                                        </div>
                                    </div>
                                </div>
                            ) : messages.length === 0 ? (
                                (() => {
                                    const { highlight, badges } = getCampusCommonGround(selectedConv?.other_user, userProfile);
                                    const icebreakers = getCampusIcebreakers(selectedConv?.other_user, userProfile);
                                    return (
                                        <div className="chat-empty-conversation-state">
                                            <div className="chat-common-ground-card">
                                                <div className="common-ground-avatar-wrap">
                                                    <img
                                                        src={getAvatarUrl(selectedConv?.other_user) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedConv?.id || 'chat'}`}
                                                        alt={selectedConv?.other_user?.full_name || 'Match'}
                                                        className="common-ground-avatar"
                                                    />
                                                    {hasActivePremium(selectedConv?.other_user) && <span className="common-ground-crown" title="Premium Member">👑</span>}
                                                </div>
                                                <h3 className="common-ground-title">
                                                    Connected with {selectedConv?.other_user?.full_name?.split(' ')[0] || 'your match'}! 🎉
                                                </h3>
                                                <p className="common-ground-subtitle">{highlight}</p>
                                                {badges.length > 0 && (
                                                    <div className="common-ground-badges">
                                                        {badges.map((badge, idx) => (
                                                            <span key={idx} className="common-ground-badge">
                                                                <span className="badge-icon">{badge.icon}</span>
                                                                <span className="badge-label">{badge.label}</span>
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="chat-icebreaker-section">
                                                <div className="chat-icebreaker-header">
                                                    <span className="chat-icebreaker-title">⚡ 1-Tap Campus Icebreakers</span>
                                                    <span className="chat-icebreaker-hint">Tap to start conversation</span>
                                                </div>
                                                <div className="chat-icebreaker-chips">
                                                    {icebreakers.map((prompt, idx) => (
                                                        <button
                                                            key={idx}
                                                            type="button"
                                                            className="chat-icebreaker-chip"
                                                            onClick={() => handleSelectIcebreaker(prompt)}
                                                        >
                                                            <span className="chip-prompt-text">{prompt}</span>
                                                            <span className="chip-prompt-icon">💬</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()
                            ) : (
                            <Virtuoso
                                ref={virtuosoRef}
                                style={{ height: '100%' }}
                                data={messages}
                                initialTopMostItemIndex={messages.length - 1}
                                followOutput="smooth"
                                startReached={() => {
                                    if (hasMore && !loadingMoreRef.current && selectedConv?.id) {
                                        loadingMoreRef.current = true;
                                        setLoadingMore(true);
                                        const nextPage = page + 1;
                                        setPage(nextPage);
                                        loadMessages(selectedConv.id, nextPage, false).finally(() => {
                                            loadingMoreRef.current = false;
                                            setLoadingMore(false);
                                        });
                                    }
                                }}
                                itemContent={(index, msg) => {
                                    if (!msg) return null;
                                    const isSent = msg.sender_id === currentUser?.id;
                                    const isSelected = activeActionMessage?.id === msg.id;
                                    const isHighlighted = highlightedMessageId === msg.id;
                                    const isSwiping = swipingMsgId === msg.id;

                                    return (
                                        <div
                                            key={msg.id}
                                            id={`msg-${msg.id}`}
                                            className={`message-row-wrapper ${isSent ? 'sent' : 'received'}`}
                                            onTouchStart={(e) => handleMessageTouchStart(e, msg)}
                                            onTouchMove={(e) => handleMessageTouchMove(e, msg.id)}
                                            onTouchEnd={() => handleMessageTouchEnd(msg)}
                                            onTouchCancel={() => handleMessageTouchEnd(msg)}
                                            onMouseDown={(e) => handleMessageMouseDown(e, msg)}
                                            onMouseUp={handleMessageMouseUp}
                                            onDoubleClick={() => handleActivateReply(msg)}
                                        >
                                            <div
                                                className={`message-bubble ${isSent ? 'message-sent' : 'message-received'} type-${msg.type || 'text'} ${msg._pending ? 'pending' : ''} ${isSelected ? 'message-selected-active' : ''} ${isHighlighted ? 'message-highlight-pulse' : ''}`}
                                                style={isSwiping && swipeOffset < 0 ? { transform: `translateX(${swipeOffset}px)` } : undefined}
                                            >
                                                {msg.metadata?.reply_to && (
                                                    <div
                                                        className="message-reply-preview-bubble clickable"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleScrollToQuotedMessage(msg.metadata.reply_to.id);
                                                        }}
                                                        title="Tap to jump to quoted message"
                                                    >
                                                        <span className="reply-sender-name">{msg.metadata.reply_to.sender}</span>
                                                        <span className="reply-content-text">{msg.metadata.reply_to.content}</span>
                                                    </div>
                                                )}
                                                {renderMessageContent(msg)}
                                                <div className="message-info">
                                                    {(msg.metadata?.edited_at || msg.metadata?.is_edited) && (
                                                        <span className="message-edited-tag" title="edited">Edited </span>
                                                    )}
                                                    <span className="message-time">
                                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    <ReadReceipt msg={msg} isSender={isSent} onRetry={handleRetryMessage} />
                                                </div>
                                                {renderReactions(msg)}
                                            </div>

                                            {/* Dynamic Swipe-Left Reply Indicator */}
                                            {isSwiping && swipeOffset < -10 && (
                                                <div
                                                    className="message-swipe-reply-indicator"
                                                    style={{
                                                        opacity: Math.min(1, Math.abs(swipeOffset) / 40),
                                                        transform: `translateY(-50%) scale(${Math.min(1, 0.6 + (Math.abs(swipeOffset) / 40) * 0.4)})`
                                                    }}
                                                >
                                                    <span className="swipe-reply-icon">↩</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                }}
                            />
                            )}
                        </div>

                        <div className="chat-input-area">
                            {replyToMessage && (
                                <div className="composer-reply-preview-container">
                                    <div className="reply-preview-details">
                                        <span className="reply-preview-sender">Replying to {replyToMessage.sender}</span>
                                        <span className="reply-preview-text">{replyToMessage.content}</span>
                                    </div>
                                    <button 
                                        type="button" 
                                        className="btn-cancel-reply-quote" 
                                        onClick={() => setReplyToMessage(null)}
                                        aria-label="Cancel reply"
                                    >
                                        &times;
                                    </button>
                                </div>
                            )}
                            {editingMessage && (
                                <div className="composer-reply-preview-container editing">
                                    <div className="reply-preview-details">
                                        <span className="reply-preview-sender">Editing Message</span>
                                        <span className="reply-preview-text">{editingMessage.content}</span>
                                    </div>
                                    <button 
                                        type="button" 
                                        className="btn-cancel-reply-quote" 
                                        onClick={() => {
                                            setEditingMessage(null);
                                            setNewMessage('');
                                        }}
                                        aria-label="Cancel edit"
                                    >
                                        &times;
                                    </button>
                                </div>
                            )}
                            <input type="file" id="chat-media-input" accept="image/*,video/*" hidden onChange={handleMediaSelect} />
                            <input type="file" id="chat-document-input" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip" hidden onChange={handleDocumentSelect} />

                            {isBlockedByMe ? (
                                <div className="chat-blocked-notice-bar">
                                    <span className="blocked-notice-text">🚫 You blocked {selectedConv?.other_user?.full_name || 'this user'}. Unblock to send messages.</span>
                                    <button type="button" className="btn-unblock-bar" onClick={handleUnblockOtherUser}>
                                        Unblock
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {showMoreActions && (
                                        <>
                                            <div 
                                                className="whatsapp-attachment-backdrop" 
                                                onClick={() => setShowMoreActions(false)} 
                                            />
                                            <div className="whatsapp-attachment-sheet" role="dialog" aria-label="Attachment Options">
                                                <div className="whatsapp-attachment-grid">
                                                    <button
                                                        type="button"
                                                        className="whatsapp-attachment-item"
                                                        onClick={() => { document.getElementById('chat-media-input').click(); setShowMoreActions(false); }}
                                                        title="Photos & Videos"
                                                    >
                                                        <div className="attachment-circle circle-media">
                                                            <span className="attachment-icon">📷</span>
                                                        </div>
                                                        <span className="attachment-label">Media</span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="whatsapp-attachment-item"
                                                        onClick={() => { document.getElementById('chat-document-input').click(); setShowMoreActions(false); }}
                                                        title="Documents & Files"
                                                    >
                                                        <div className="attachment-circle circle-doc">
                                                            <span className="attachment-icon">📄</span>
                                                        </div>
                                                        <span className="attachment-label">Document</span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="whatsapp-attachment-item"
                                                        onClick={() => { setShowLocationPicker(true); setShowMoreActions(false); }}
                                                        title="Live Location Sharing"
                                                    >
                                                        <div className="attachment-circle circle-location">
                                                            <span className="attachment-icon">📍</span>
                                                        </div>
                                                        <span className="attachment-label">Location</span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="whatsapp-attachment-item"
                                                        onClick={() => { setShowGifts(true); setShowMoreActions(false); }}
                                                        title="Campus Virtual Gifts"
                                                    >
                                                        <div className="attachment-circle circle-gift">
                                                            <span className="attachment-icon">🎁</span>
                                                        </div>
                                                        <span className="attachment-label">Gift</span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="whatsapp-attachment-item"
                                                        onClick={() => { setShowDealModal(true); setShowMoreActions(false); }}
                                                        title="Campus Service Escrow Deals"
                                                    >
                                                        <div className="attachment-circle circle-escrow">
                                                            <span className="attachment-icon">🤝</span>
                                                        </div>
                                                        <span className="attachment-label">Escrow</span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="whatsapp-attachment-item"
                                                        onClick={() => { setShowMiniGameModal(true); setShowMoreActions(false); }}
                                                        title="Campus Mini-Games & Icebreakers"
                                                    >
                                                        <div className="attachment-circle circle-game">
                                                            <span className="attachment-icon">🎮</span>
                                                        </div>
                                                        <span className="attachment-label">Games</span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="whatsapp-attachment-item"
                                                        onClick={(e) => { handleSmartReplies(e); setShowMoreActions(false); }}
                                                        title="AI Smart Suggestions"
                                                        disabled={aiReplyLoading}
                                                    >
                                                        <div className="attachment-circle circle-ai">
                                                            <span className="attachment-icon">✨</span>
                                                        </div>
                                                        <span className="attachment-label">AI Assist</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {/* AI Smart Suggestions Strip */}

                                    {aiReplies.length > 0 && (
                                        <div className="chat-ai-suggestions-strip" role="region" aria-label="AI Suggestions">
                                            <div className="ai-suggestions-header">
                                                <span className="ai-suggestions-title">✨ AI Suggestions</span>
                                                <button
                                                    type="button"
                                                    className="btn-ai-dismiss"
                                                    onClick={() => setAiReplies([])}
                                                    title="Dismiss suggestions"
                                                    aria-label="Dismiss suggestions"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                            <div className="ai-suggestions-scroll">
                                                {aiReplies.map((reply, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        className="ai-suggestion-chip"
                                                        onClick={() => handleSelectAiReply(reply)}
                                                    >
                                                        <span className="chip-sparkle">💬</span>
                                                        <span className="chip-text">{reply}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Real-time contact safeguard typing pill */}
                                    {offPlatformTypingCheck.blocked && !isUltra && (
                                        <div className="chat-composer-safeguard-hint animate-fade-in">
                                            <span className="safeguard-hint-icon">🔒</span>
                                            <span className="safeguard-hint-text">
                                                Phone numbers & social handles are restricted on standard plans.
                                            </span>
                                            <button
                                                type="button"
                                                className="btn-safeguard-hint-upgrade"
                                                onClick={() => showOffPlatformBlock(offPlatformTypingCheck)}
                                            >
                                                Unlock with Ultra (₦15k) 👑
                                            </button>
                                        </div>
                                    )}

                                    <form className={`chat-input-form-wrapper ${isVoiceRecording ? 'voice-recording-active' : ''}`} onSubmit={handleSendMessage}>

                                        {!isVoiceRecording && (
                                            <>
                                                <button 
                                                    type="button" 
                                                    className={`btn-more-actions-toggle ${showMoreActions ? 'active' : ''}`} 
                                                    onClick={() => setShowMoreActions(!showMoreActions)}
                                                    title={showMoreActions ? "Close Actions" : "Add Features (Media, Documents, Location, Gifts, Escrow, AI Assist)"}
                                                    aria-label={showMoreActions ? "Close Actions" : "Add Attachments and Campus Features"}
                                                    aria-expanded={showMoreActions}
                                                >
                                                    {showMoreActions ? (
                                                        <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" className="toggle-svg-icon">
                                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                                        </svg>
                                                    ) : (
                                                        <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="toggle-svg-icon icon-paperclip">
                                                            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                                                        </svg>
                                                    )}
                                                </button>

                                        <div className="chat-composer-pill">
                                            <button
                                                type="button"
                                                className="btn-icon composer-inline-btn"
                                                onClick={() => setShowStickers(!showStickers)}
                                                title="Stickers & Emojis"
                                            >
                                                <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                                    <circle cx="12" cy="12" r="10"></circle>
                                                    <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                                                    <line x1="9" y1="9" x2="9.01" y2="9"></line>
                                                    <line x1="15" y1="9" x2="15.01" y2="9"></line>
                                                </svg>
                                            </button>
                                            <textarea
                                                ref={chatInputRef}
                                                id="chat-message-input"
                                                name="message"
                                                rows={1}
                                                className="chat-input chat-textarea"
                                                placeholder="Message"
                                                value={newMessage}
                                                onFocus={scrollToBottomSmooth}
                                                onChange={e => { setNewMessage(e.target.value); handleTyping(); }}
                                                onCompositionStart={() => {
                                                    isComposingRef.current = true;
                                                }}
                                                onCompositionEnd={() => {
                                                    isComposingRef.current = false;
                                                }}
                                                onKeyDown={e => {
                                                    if (
                                                        e.key === 'Enter' && !e.shiftKey &&
                                                        !e.nativeEvent?.isComposing &&
                                                        !isComposingRef.current &&
                                                        e.keyCode !== 229 &&
                                                        e.which !== 229
                                                    ) {
                                                        e.preventDefault();
                                                        handleSendMessage(e);
                                                    }
                                                }}
                                                inputMode="text"
                                                autoComplete="on"
                                                autoCorrect="on"
                                                autoCapitalize="sentences"
                                                spellCheck={true}
                                                enterKeyHint="send"
                                            />
                                        </div>
                                    </>
                                )}

                                <div className={`chat-send-actions ${isVoiceRecording ? 'voice-takeover-active' : ''}`}>
                                    {!isVoiceRecording && newMessage.trim() ? (
                                        <button type="submit" className="btn-send">
                                            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="22" y1="2" x2="11" y2="13"></line>
                                                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                            </svg>
                                        </button>
                                    ) : (
                                        <VoiceRecorder
                                            onRecordingComplete={handleVoiceStop}
                                            isSending={sending}
                                            onRecordingStateChange={setIsVoiceRecording}
                                        />
                                    )}
                                </div>
                            </form>
                        </>
                    )}

                            {showStickers && <StickerDrawer onSelectSticker={handleStickerSelect} onClose={() => setShowStickers(false)} />}
                        </div>
                    </>
                ) : (
                    <div className="chat-dashboard animate-fade-in">
                        <div className="dashboard-header-premium">
                            <div className="dashboard-icon-ring"><span className="icon-main">💬</span></div>
                            <h2>Your Conversations</h2>
                            <p>Pick up where you left off or start something new</p>
                            <ContextualTip
                                featureId="messages_chat"
                                onLearnMore={() => setGuideModalOpen(true)}
                            />
                        </div>
                        {conversations.length > 0 ? (
                            <div className="dashboard-sections">
                                {conversations.some(c => c && !c.last_message) && (
                                    <section className="dashboard-section new-matches-section">
                                        <h3 className="section-label">✨ New Matches</h3>
                                        <div className="new-matches-row">
                                            {conversations.filter(c => c && !c.last_message).slice(0, 5).map(conv => (
                                                <div key={conv.id} className="new-match-avatar-card" onClick={() => handleSelectConversation(conv)}>
                                                    <div className="avatar-ring"><img src={getAvatarUrl(conv.other_user) || conv.other_user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${conv.id}`} alt={conv.other_user?.full_name || 'Match'} /></div>
                                                    <span className="match-name">{conv.other_user?.full_name?.split(' ')[0] || 'Match'}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}
                                <section className="dashboard-section recent-chats-section">
                                    <h3 className="section-label">🕒 Recent Chats</h3>
                                    <div className="recent-chats-grid">
                                        {conversations.filter(c => c && c.last_message).slice(0, 6).map(conv => (
                                            <div key={conv.id} className="recent-chat-card glass" onClick={() => handleSelectConversation(conv)}>
                                                <img src={getAvatarUrl(conv.other_user) || conv.other_user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${conv.id}`} alt={conv.other_user?.full_name || 'User'} className="card-avatar" />
                                                <div className="card-info"><span className="card-name">{conv.other_user?.full_name || 'User'}</span><p className="card-last-msg">{conv.last_message}</p></div>
                                                <div className="card-arrow">→</div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </div>
                        ) : (
                            <div className="no-conv-fallback">
                                <div className="fallback-emoji">💝</div>
                                <p>No matches yet. Your next vibe is just a swipe away!</p>
                                <button className="btn-go-swiping" onClick={() => navigate('/match')}>Go Swiping</button>
                            </div>
                        )}
                    </div>
                )}
            </div>
            <AppGuideModal
                isOpen={guideModalOpen}
                onClose={() => setGuideModalOpen(false)}
                initialFeatureId="messages_chat"
            />
            <OfficialHubModal
                isOpen={officialHubOpen}
                onClose={() => setOfficialHubOpen(false)}
            />
            <OffPlatformBlockedModal
                violation={offPlatformViolation}
                attemptCount={offPlatformAttempts}
                onClose={() => setOffPlatformViolation(null)}
                onEdit={() => {
                    setOffPlatformViolation(null);
                    setTimeout(() => chatInputRef.current?.focus(), 60);
                }}
                onUpgrade={() => {
                    setOffPlatformViolation(null);
                    navigate('/premium?tier=ultra&selected=ultra_monthly');
                }}
            />
            {contextConv && (
                <ChatActionModal
                    conversation={contextConv}
                    isMuted={mutedConvs.includes(contextConv?.id)}
                    onClose={() => setContextConv(null)}
                    onToggleRead={handleToggleConvRead}
                    onViewProfile={handleViewProfile}
                    onToggleMute={handleToggleConvMute}
                    onDeleteConversation={handleDeleteConv}
                />
            )}
            {statusChoiceTarget && (
                <StatusChoiceModal
                    isOpen={Boolean(statusChoiceTarget)}
                    contact={statusChoiceTarget.user}
                    onClose={() => setStatusChoiceTarget(null)}
                    onSelectStatus={() => {
                        if (statusChoiceTarget) {
                            setActiveViewingStatus({ ...statusChoiceTarget });
                        }
                        setStatusChoiceTarget(null);
                    }}
                    onSelectProfile={(contact) => {
                        const targetConvId = statusChoiceTarget?.conversationId || (selectedConv?.other_user?.id === contact.id ? selectedConv?.id : null);
                        setStatusChoiceTarget(null);
                        navigate(`/profile/${contact.id}`, {
                            state: {
                                conversationId: targetConvId,
                                matchId: targetConvId,
                                fromChat: true,
                                partnerProfile: contact
                            }
                        });
                    }}
                />
            )}
            {activeViewingStatus && (
                <StatusViewer
                    statuses={activeViewingStatus.statuses}
                    profile={activeViewingStatus.user}
                    onClose={() => setActiveViewingStatus(null)}
                />
            )}
        </div>
    );
}
