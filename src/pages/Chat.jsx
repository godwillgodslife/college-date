import { useState, useEffect, useRef, useCallback } from 'react';
import { formatSidebarTimestamp, formatChatTimestamp } from '../utils/formatTimestamp';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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
    getSignedChatMediaUrl,
    updateDisappearingMessages,
    addReaction,
    editMessage,
} from '../services/chatService';
import { compressImage, generateBlurPlaceholder } from '../utils/imageCompressor';
import { getWallet } from '../services/paymentService';
import { sendGift } from '../services/giftService';
import { requestAiAssistant } from '../services/aiAssistantService';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import VoiceRecorder from '../components/ChatVoiceRecorder';
import StickerDrawer from '../components/StickerDrawer';
import GiftStore from '../components/GiftStore';
import MessageReactionBar from '../components/MessageReactionBar';
import AudioMessage from '../components/AudioMessage';
import './Chat.css';

const ICEBREAKERS = [
    "What's your favorite spot on campus? 🏫",
    "If you could have dinner with one lecturer, who would it be? 🍎",
    "What's the best thing about your course? 📚",
    "Early bird or night owl in the library? 🦉",
    "What's your go-to campus snack? 🍕"
];

const DISAPPEARING_OPTIONS = [
    { label: 'Off', seconds: 0 },
    { label: '24 hours', seconds: 24 * 60 * 60 },
    { label: '7 days', seconds: 7 * 24 * 60 * 60 },
    { label: '30 days', seconds: 30 * 24 * 60 * 60 },
];

import { useConversations } from '../hooks/useSWRData';
import { Virtuoso } from 'react-virtuoso';
import OptimizedImage from '../components/OptimizedImage';
import { playSendSwoosh, playNotificationDing } from '../lib/audioContext';


// ── Tick Read-Receipt Icons ────────────────────────────────────────────
function ReadReceipt({ msg, isSender }) {
    if (!isSender) return null;
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
        const source = msg.metadata?.storage_path || msg.content;
        if (!source) return undefined;

        if (/^https?:\/\//i.test(source) || source.startsWith('blob:')) {
            return undefined;
        }

        getSignedChatMediaUrl(source).then(({ url, error }) => {
            if (cancelled) return;
            if (error || !url) {
                setLoadError(error || 'Could not load media');
                return;
            }
            setMediaUrl(url);
        });

        return () => {
            cancelled = true;
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
    const navigate = useNavigate();
    const location = useLocation();


    const [selectedConv, setSelectedConv] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [presence, setPresence] = useState({});
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore] = useState(false);

    // SWR for Conversations Sidebar via custom hook
    const { data: conversations = [], isLoading: convsLoading, mutate: revalidateConvs } = useConversations(currentUser?.id);

    const [callChoiceOpen, setCallChoiceOpen] = useState(false);
    const typingTimeoutRef = useRef(null);
    const presenceChannelRef = useRef(null);
    const isTypingRef = useRef(false);

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
    const [likesCount, setLikesCount] = useState(0);
    const [viewsCount, setViewsCount] = useState(0);
    const [pendingRequestsList, setPendingRequestsList] = useState([]);

    // Reaction bar state
    const [reactionBar, setReactionBar] = useState(null);
    const longPressTimer = useRef(null);

    const [pendingSelection, setPendingSelection] = useState(null);

    const [replyToMessage, setReplyToMessage] = useState(null);
    const [editingMessage, setEditingMessage] = useState(null);
    const [showMoreActions, setShowMoreActions] = useState(false);

    // Fetch Likes (Pending incoming swipes) and views count
    useEffect(() => {
        if (!currentUser) return;
        
        const fetchActivityCounts = async () => {
            try {
                // Fetch pending incoming swipes (likes)
                const { count: likes, data: reqList } = await supabase
                    .from('swipes')
                    .select('id, swiper:profiles!swipes_swiper_id_fkey(id, full_name, avatar_url)', { count: 'exact' })
                    .eq('swiped_id', currentUser.id)
                    .eq('status', 'pending');
                    
                setLikesCount(likes || 0);
                setPendingRequestsList(reqList || []);

                // Fetch profile views (views)
                const { count: views } = await supabase
                    .from('profile_views')
                    .select('id', { count: 'exact' })
                    .eq('profile_owner_id', currentUser.id);
                    
                setViewsCount(views || 0);
            } catch (err) {
                console.error('Error fetching activity counts:', err);
            }
        };
        
        fetchActivityCounts();
    }, [currentUser]);

    const createClientNonce = () => `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    const mergeMessageList = useCallback((prev, incoming) => {
        const nonce = incoming.metadata?.client_nonce;
        const existingIndex = prev.findIndex(msg => (
            msg.id === incoming.id ||
            (nonce && msg.metadata?.client_nonce === nonce)
        ));

        if (existingIndex >= 0) {
            return prev.map((msg, index) => index === existingIndex ? { ...incoming, _pending: false } : msg);
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

        // First attempt: Check if target exists in current list
        const target = finalChatId 
            ? conversations.find(c => c.id === finalChatId || c.match_id === finalChatId)
            : conversations.find(c => (c.other_user?.id || c.other_user_id) === finalTargetId);

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
            ? conversations.find(c => c.id === chatId || c.match_id === chatId)
            : conversations.find(c => (c.other_user?.id || c.other_user_id) === openChatWith);

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


    // Robust Retry: Watch conversations and pick up pending selection once it arrives
    useEffect(() => {
        if (!pendingSelection || conversations.length === 0) return;

        const { chatId, openChatWith } = pendingSelection;
        const target = chatId 
            ? conversations.find(c => c.id === chatId)
            : conversations.find(c => c.other_user?.id === openChatWith);

        if (target) {
            console.log('[Chat] Pending target found! Selecting...');
            setSelectedConv(target);
            setPendingSelection(null);
        }
    }, [conversations, pendingSelection]);

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

    useEffect(() => {
        if (!selectedConv || !selectedConv.id || selectedConv.id === 'null' || !currentUser || !userProfile) return;
        setPage(0);
        setMessages([]);
        loadMessages(selectedConv.id, 0, true);
        markConversationRead(selectedConv.id, currentUser.id);


        const msgSub = subscribeToMessages(
            selectedConv.id,
            (payload) => {
                setMessages(prev => mergeMessageList(prev, payload));
                if (payload.sender_id !== currentUser.id) {
                    markMessageAsRead(payload.id);
                    playNotificationDing(); // Ding when a message arrives
                }
            },
            (payload) => {
                setMessages(prev => prev.map(m => m.id === payload.id ? payload : m));
            }
        );

        presenceChannelRef.current = setupPresence(
            selectedConv.id,
            currentUser.id,
            userProfile,
            (state) => setPresence(state)
        );

        return () => {
            msgSub.unsubscribe();
            presenceChannelRef.current?.unsubscribe();
            isTypingRef.current = false;
        };
    }, [selectedConv, currentUser, userProfile, mergeMessageList]);

    // ── Load messages (paginated) ──────────────────────────────────────
    async function loadMessages(matchId, pageNum = 0, reset = false) {
        const { data, total } = await getMessages(matchId, pageNum);

        if (reset) {
            setMessages(data);
            setHasMore(total > data.length);
        } else {
            setMessages(prev => {
                const combined = [...data, ...prev];
                return combined.length > 200 ? combined.slice(-200) : combined;
            });
            setHasMore(total > (pageNum + 1) * 20 + messages.length);
        }
    }

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedConv || sending) return;

        // Block sending ONLY if we truly don't have a database ID yet
        const isInvalidId = !selectedConv.id || (typeof selectedConv.id === 'string' && selectedConv.id.startsWith('temp-'));
        
        if (isInvalidId) {
            addToast('⏳ Match is still syncing… please wait a moment and try again!', 'info');
            revalidateConvs(); // force a refresh to try to get the real match
            return;
        }

        const content = newMessage.trim();

        if (editingMessage) {
            setSending(true);
            const { data, error } = await editMessage(editingMessage.id, content);
            if (error) {
                addToast(`Edit failed: ${error}`, 'error');
            } else if (data) {
                setMessages(prev => prev.map(m => m.id === editingMessage.id ? data : m));
                addToast('Message edited!', 'success');
                setEditingMessage(null);
                setNewMessage('');
            }
            setSending(false);
            return;
        }

        const optimisticId = `temp-${Date.now()}`;
        const clientNonce = createClientNonce();
        
        const metadata = { client_nonce: clientNonce };
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
        setNewMessage('');
        setReplyToMessage(null);
        setSending(true);
        stopTyping();

        const { data, error } = await sendMessage(selectedConv.id, currentUser.id, content, 'text', metadata);
        if (error) {
            setMessages(prev => prev.filter(m => m.id !== optimisticId));
            addToast('Failed to send.', 'error');
        } else if (data) {
            setMessages(prev => mergeMessageList(prev, data));
            playSendSwoosh(); // Audible "sent" confirmation
        }
        setSending(false);
    };

    const handleSmartReplies = async () => {
        if (!selectedConv || aiReplyLoading) return;
        setAiReplyLoading(true);
        const { data, error } = await requestAiAssistant('smart_reply', {
            targetProfile: selectedConv.other_user,
            recentMessages: messages.slice(-8),
            draft: newMessage
        });
        if (!error) setAiReplies(data?.replies || []);
        setAiReplyLoading(false);
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
    const initiateCall = async (type) => {
        setCallChoiceOpen(false);
        const name = encodeURIComponent(selectedConv.other_user?.full_name || 'User');
        const roomId = selectedConv.id;
        
        try {
            // 1. Send Signaling Message (The "Ring")
            const callTypeLabel = type === 'video' ? 'Video Call' : 'Voice Call';
            const { error } = await sendMessage(roomId, currentUser.id, `Started a ${callTypeLabel}`, 'call_log', {
                callType: type,
                roomId: roomId,
                startTime: new Date().toISOString()
            });

            if (error) {
                console.error('Call signaling error:', error);
                addToast('Failed to start call log: ' + error, 'error');
                // We still proceed to navigate because the call itself might still work, 
                // but this explains why logs are missing.
            }

            // 2. Navigate to Room
            navigate(`/call/${roomId}?type=${type}&name=${name}`);
        } catch (err) {
            console.error('initiateCall exception:', err);
            addToast('Connection error starting call', 'error');
            navigate(`/call/${roomId}?type=${type}&name=${name}`);
        }
    };

    const handleVoiceStop = async (blob) => {
        setSending(true);
        const clientNonce = createClientNonce();
        const { path, url, error } = await uploadVoiceNote(selectedConv.id, currentUser.id, blob);
        if (error) { addToast('Upload failed', 'error'); setSending(false); return; }
        await sendMessage(selectedConv.id, currentUser.id, path, 'voice', {
            client_nonce: clientNonce,
            storage_path: path,
            preview_url: url
        });
        setSending(false);
    };

    const handleImageSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !selectedConv) return;
        setSending(true);
        const optimisticId = `temp-${Date.now()}`;
        try {
            const placeholder = await generateBlurPlaceholder(file);
            const clientNonce = createClientNonce();
            const localPreviewUrl = URL.createObjectURL(file);
            setMessages(prev => mergeMessageList(prev, {
                id: optimisticId, match_id: selectedConv.id, sender_id: currentUser.id,
                content: localPreviewUrl, type: 'image', metadata: { placeholder, client_nonce: clientNonce },
                created_at: new Date().toISOString(), is_read: false, _pending: true
            }));

            const compressed = await compressImage(file, { targetSizeKB: 100 });
            const { path, url, error } = await uploadChatImage(selectedConv.id, currentUser.id, compressed);
            if (error) throw new Error(error);

            const { data } = await sendMessage(selectedConv.id, currentUser.id, path, 'image', {
                placeholder,
                client_nonce: clientNonce,
                storage_path: path,
                preview_url: url
            });
            if (data) setMessages(prev => mergeMessageList(prev, data));
        } catch (err) {
            setMessages(prev => prev.filter(m => m.id !== optimisticId));
            addToast('Failed to send image: ' + err.message, 'error');
        } finally {
            setSending(false);
            e.target.value = '';
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
            id: optimisticId, match_id: selectedConv.id, sender_id: currentUser.id,
            content, type, metadata: messageMetadata, created_at: new Date().toISOString(), is_read: false, _pending: true
        }));

        const { data, error } = await sendMessage(selectedConv.id, currentUser.id, content, type, messageMetadata);
        if (error) { setMessages(prev => prev.filter(m => m.id !== optimisticId)); }
        else if (data) { setMessages(prev => mergeMessageList(prev, data)); }
        setSending(false);
    };

    const handleGiftSend = async (gift) => {
        if (!selectedConv?.other_user?.id) { addToast('Recipient ID missing', 'error'); return false; }
        setSending(true);
        try {
            const { data: txData, error: txError } = await sendGift(currentUser.id, selectedConv.other_user.id, gift.id);
            if (txError) { addToast(txError, 'error'); return false; }
            if (txData?.new_balance !== undefined) setWalletBalance(txData.new_balance);

            const optimisticId = `temp-${Date.now()}`;
            const clientNonce = createClientNonce();
            const giftMsg = {
                id: optimisticId, match_id: selectedConv.id, sender_id: currentUser.id,
                content: gift.emoji, type: 'gift',
                metadata: { name: gift.name, price: gift.price, client_nonce: clientNonce },
                created_at: new Date().toISOString(), is_read: false, _pending: true
            };
            setMessages(prev => mergeMessageList(prev, giftMsg));

            const { data, error: msgError } = await sendMessage(
                selectedConv.id, currentUser.id, gift.emoji, 'gift', { name: gift.name, price: gift.price, client_nonce: clientNonce }
            );
            if (msgError) {
                setMessages(prev => prev.filter(m => m.id !== optimisticId));
                addToast('Gift paid, but chat notification failed.', 'warning');
                return true;
            } else if (data) {
                setMessages(prev => mergeMessageList(prev, data));
                addToast(`Sent ${gift.name}! 🎁`, 'success');
                return true;
            }
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
        const previous = selectedConv.disappearing_messages_seconds || 0;
        setSelectedConv(prev => prev ? { ...prev, disappearing_messages_seconds: seconds } : prev);
        const { error } = await updateDisappearingMessages(selectedConv.id, seconds);
        if (error) {
            setSelectedConv(prev => prev ? { ...prev, disappearing_messages_seconds: previous } : prev);
            addToast('Could not update disappearing messages.', 'error');
        } else {
            addToast(seconds ? 'Disappearing messages updated.' : 'Disappearing messages turned off.', 'success');
            setChatMenuOpen(false);
            revalidateConvs();
        }
        setDisappearingSaving(false);
    };

    // Reactions
    const handleLongPressStart = (e, msgId) => {
        const touch = e.touches ? e.touches[0] : e;
        longPressTimer.current = setTimeout(() => {
            setReactionBar({ msgId, x: Math.min(touch.clientX - 80, window.innerWidth - 200), y: touch.clientY - 80 });
        }, 500);
    };
    const handleLongPressEnd = () => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };

    const handleReact = async (emoji) => {
        if (!reactionBar) return;
        await addReaction(reactionBar.msgId, emoji, currentUser.id);
        // Optimistic local update
        setMessages(prev => prev.map(m => {
            if (m.id !== reactionBar.msgId) return m;
            const reactions = { ...(m.metadata?.reactions || {}) };
            const existing = reactions[emoji] || [];
            if (existing.includes(currentUser.id)) {
                reactions[emoji] = existing.filter(id => id !== currentUser.id);
                if (!reactions[emoji].length) delete reactions[emoji];
            } else {
                reactions[emoji] = [...existing, currentUser.id];
            }
            return { ...m, metadata: { ...m.metadata, reactions } };
        }));
        setReactionBar(null);
    };

    const renderMessageContent = (msg) => {
        switch (msg.type) {
            case 'voice': return <ChatMedia msg={msg} type="voice" isSent={msg.sender_id === currentUser.id} />;
            case 'image': return <ChatMedia msg={msg} type="image" isSent={msg.sender_id === currentUser.id} />;
            case 'sticker': return <div className="sticker-message"><span className="sticker-emoji-large">{msg.content}</span><span className="sticker-label">{msg.metadata?.label}</span></div>;
            case 'gift': return <div className="gift-message"><div className="gift-animation">🎁</div><span className="gift-emoji-large">{msg.content}</span><span className="gift-label">SENT A {msg.metadata?.name}</span></div>;
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
                                onClick={() => navigate(`/call/${msg.match_id}?type=${callType}&name=${encodeURIComponent(selectedConv.other_user?.full_name || 'User')}`)}
                            >
                                Join Call
                            </button>
                        ) : (
                            <span className="call-status-tag">{isMe ? 'Call Started' : 'Call ended'}</span>
                        )}
                    </div>
                );
            }
            default: return <div className="message-content-text">{msg.content}</div>;
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
                        onClick={() => handleReact(emoji)}
                    >
                        {emoji} <span>{users.length}</span>
                    </span>
                ))}
            </div>
        );
    };

    // ── Derived Presence State ─────────────────────────────────────────
    const otherUserId = selectedConv?.other_user?.id;
    const opponentPresences = presence[otherUserId] || [];
    const isOtherOnline = opponentPresences.length > 0;
    const isOtherTyping = opponentPresences.some(p => p.is_typing);
    const activeDisappearingSeconds = selectedConv?.disappearing_messages_seconds || 0;
    const activeDisappearingLabel = DISAPPEARING_OPTIONS.find(option => option.seconds === activeDisappearingSeconds)?.label || 'Custom';

    // Derived filtered conversations list
    const filteredConvs = conversations.filter(conv => {
        const matchesSearch = searchQuery.trim() === '' ||
            (conv.other_user?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (conv.last_message || '').toLowerCase().includes(searchQuery.toLowerCase());

        if (filterTab === 'Unread') {
            return matchesSearch && conv.has_unread;
        }
        if (filterTab === 'Online') {
            return matchesSearch && (presence[conv.other_user?.id]?.length || 0) > 0;
        }
        return matchesSearch;
    });

    if (convsLoading && conversations.length === 0) return <LoadingSpinner fullScreen text="Opening messages..." />;

    return (
        <div className="chat-page">
            {reactionBar && <MessageReactionBar position={{ x: reactionBar.x, y: reactionBar.y }} onReact={handleReact} onClose={() => setReactionBar(null)} />}
            {showGifts && <GiftStore onClose={() => setShowGifts(false)} onSend={handleGiftSend} balance={walletBalance} />}

            <div className={`chat-sidebar ${selectedConv ? 'hide' : 'show'}`}>
                <div className="chat-sidebar-header">
                    <h1>Messages</h1>
                </div>

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
                    <div className="activity-circle likes-circle" onClick={() => navigate('/requests')}>
                        <div className={`activity-avatar-frame ${!userProfile?.is_premium ? 'blurred' : ''}`}>
                            <span className="activity-emoji">❤️</span>
                            {likesCount > 0 && <span className="activity-badge">{likesCount}</span>}
                        </div>
                        <span className="activity-label">Likes</span>
                    </div>

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
                                    <img src={swiper.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${swiper.id}`} alt="" />
                                    <span className="request-badge-dot">●</span>
                                </div>
                                <span className="activity-label">{swiper.full_name?.split(' ')[0]}</span>
                            </div>
                        );
                    })}
                </div>

                <div className="conversation-list">
                    {filteredConvs.length === 0 ? (
                        <div className="chat-empty-state"><p>No messages found.</p></div>
                    ) : (
                        filteredConvs.map((conv) => {
                            const isTypingNow = presence[conv.other_user?.id]?.some(p => p.is_typing);
                            const isOnline = (presence[conv.other_user?.id]?.length || 0) > 0;
                            const isSentByMe = conv.last_message_sender_id === currentUser?.id;
                            const hasUnread = conv.has_unread && selectedConv?.id !== conv.id;
                            const typePrefix = conv.last_message_type === 'voice' ? '🎙️ ' : conv.last_message_type === 'gift' ? '🎁 ' : conv.last_message_type === 'sticker' ? '😊 ' : '';
                            return (
                                <div key={conv.id} className={`conversation-item ${selectedConv?.id === conv.id ? 'active' : ''} ${hasUnread ? 'unread' : ''}`} onClick={() => { setSelectedConv(conv); setPendingSelection(null); }}>
                                    <div className="avatar-wrapper" onClick={e => { e.stopPropagation(); navigate(`/profile/${conv.other_user?.id}`); }}>
                                        <img src={conv.other_user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${conv.id}`} alt="" className="conv-avatar" />
                                        {isOnline && <span className="online-dot" />}
                                    </div>
                                    <div className="conv-info">
                                        <div className="conv-name-row">
                                            <span className={`conv-name ${hasUnread ? 'bold' : ''}`}>{conv.other_user?.full_name || 'User'}</span>
                                            <span className="conv-time">{formatSidebarTimestamp(conv.last_message_at)}</span>
                                        </div>
                                        <div className="conv-last-msg">
                                            {isTypingNow ? <span className="typing-text">typing...</span> : <span className={`msg-snippet ${hasUnread ? 'unread-text' : ''}`}>{isSentByMe ? 'You: ' : ''}{typePrefix}{conv.last_message || 'Say hi 👋'}</span>}
                                        </div>
                                    </div>
                                    <div className="conv-meta-right">{hasUnread && <span className="unread-badge">●</span>}</div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            <div className={`chat-window ${!selectedConv ? 'hide-mobile' : 'show'}`}>
                {selectedConv ? (
                    <>
                        <div className="chat-header">
                            <button className="back-btn" onClick={() => setSelectedConv(null)}>←</button>
                            <div className="header-info" onClick={() => navigate(`/profile/${selectedConv.other_user?.id}`)}>
                                <div className="header-avatar-container">
                                    <img src={selectedConv.other_user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedConv.id}`} alt="" className="header-avatar" />
                                    {isOtherOnline && <span className="online-dot-large" />}
                                </div>
                                <div className="header-text">
                                    <span className="header-name">{selectedConv.other_user?.full_name}</span>
                                    <span className={`status-text ${isOtherOnline ? 'online' : ''}`}>{isOtherTyping ? 'typing...' : isOtherOnline ? 'Online' : (selectedConv.other_user?.last_seen_at ? formatChatTimestamp(selectedConv.other_user.last_seen_at) : 'Offline')}</span>
                                </div>
                            </div>
                            <div className="chat-header-actions" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
                                <button 
                                    className={`btn-call ${callChoiceOpen ? 'active' : ''}`} 
                                    onClick={() => setCallChoiceOpen(!callChoiceOpen)} 
                                    title="Call Options"
                                >
                                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                    </svg>
                                </button>

                                {callChoiceOpen && (
                                    <div className="call-selection-popover">
                                        <button className="call-option" onClick={() => initiateCall('voice')}>
                                            <span className="option-icon">📞</span>
                                            <div className="option-text">
                                                <strong>Voice Call</strong>
                                                <span>Audio only connection</span>
                                            </div>
                                        </button>
                                        <button className="call-option video" onClick={() => initiateCall('video')}>
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
                                    onClick={() => setChatMenuOpen(open => !open)}
                                    title="Chat settings"
                                >
                                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="1" />
                                        <circle cx="19" cy="12" r="1" />
                                        <circle cx="5" cy="12" r="1" />
                                    </svg>
                                </button>

                                {chatMenuOpen && (
                                    <div className="chat-settings-popover">
                                        <div className="chat-settings-title">Disappearing messages</div>
                                        <div className="disappearing-options">
                                            {DISAPPEARING_OPTIONS.map(option => (
                                                <button
                                                    key={option.seconds}
                                                    type="button"
                                                    className={activeDisappearingSeconds === option.seconds ? 'selected' : ''}
                                                    onClick={() => handleDisappearingChange(option.seconds)}
                                                    disabled={disappearingSaving}
                                                >
                                                    {option.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="messages-container">
                            {activeDisappearingSeconds > 0 && (
                                <div className="disappearing-notice">
                                    Messages in this chat disappear after {activeDisappearingLabel.toLowerCase()}.
                                </div>
                            )}
                            <Virtuoso
                                style={{ height: '100%' }}
                                data={messages}
                                initialTopMostItemIndex={messages.length - 1}
                                followOutput="smooth"
                                startReached={() => {
                                    if (hasMore && !loadingMore) {
                                        const nextPage = page + 1;
                                        setPage(nextPage);
                                        loadMessages(selectedConv.id, nextPage, false);
                                    }
                                }}
                                itemContent={(index, msg) => (
                                    <div
                                        key={msg.id}
                                        className={`message-bubble ${msg.sender_id === currentUser.id ? 'message-sent' : 'message-received'} type-${msg.type || 'text'} ${msg._pending ? 'pending' : ''}`}
                                        onMouseDown={e => handleLongPressStart(e, msg.id)}
                                        onTouchStart={e => handleLongPressStart(e, msg.id)}
                                        onMouseUp={handleLongPressEnd}
                                        onTouchEnd={handleLongPressEnd}
                                        onDoubleClick={() => setReplyToMessage({ id: msg.id, sender: msg.sender_id === currentUser.id ? 'You' : (selectedConv.other_user?.full_name || 'User'), content: msg.type === 'text' ? msg.content : `[${msg.type}]` })}
                                    >
                                        {msg.metadata?.reply_to && (
                                            <div className="message-reply-preview-bubble">
                                                <span className="reply-sender-name">{msg.metadata.reply_to.sender}</span>
                                                <span className="reply-content-text">{msg.metadata.reply_to.content}</span>
                                            </div>
                                        )}
                                        {renderMessageContent(msg)}
                                        <div className="message-info">
                                            {(msg.metadata?.edited_at || msg.metadata?.is_edited) && <span className="message-edited-tag" title="edited">(edited) </span>}
                                            <span className="message-time">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            <ReadReceipt msg={msg} isSender={msg.sender_id === currentUser.id} />
                                        </div>
                                        {renderReactions(msg)}
                                        {!msg._pending && (
                                            <div className="message-action-buttons">
                                                <button 
                                                    type="button"
                                                    className="btn-quick-reply-bubble" 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setReplyToMessage({ 
                                                            id: msg.id, 
                                                            sender: msg.sender_id === currentUser.id ? 'You' : (selectedConv.other_user?.full_name || 'User'), 
                                                            content: msg.type === 'text' ? msg.content : `[${msg.type}]` 
                                                        });
                                                    }}
                                                    title="Reply"
                                                >
                                                    ↩️
                                                </button>
                                                {msg.sender_id === currentUser.id && msg.type === 'text' && (Date.now() - new Date(msg.created_at).getTime()) < 15 * 60 * 1000 && (
                                                    <button
                                                        type="button"
                                                        className="btn-quick-edit-bubble"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingMessage(msg);
                                                            setNewMessage(msg.content);
                                                        }}
                                                        title="Edit Message"
                                                    >
                                                        ✏️
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            />
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
                            <input type="file" id="chat-image-input" accept="image/*" hidden onChange={handleImageSelect} />
                            {(aiReplies.length > 0 || aiReplyLoading) && (
                                <div className="ai-reply-strip">
                                    {aiReplyLoading ? (
                                        <span className="ai-reply-loading">AI is thinking...</span>
                                    ) : aiReplies.slice(0, 3).map((reply) => (
                                        <button key={reply} type="button" onClick={() => setNewMessage(reply)}>
                                            {reply}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <form className="chat-input-form-wrapper" onSubmit={handleSendMessage}>
                                <button 
                                    type="button" 
                                    className={`btn-more-actions-toggle ${showMoreActions ? 'active' : ''}`} 
                                    onClick={() => setShowMoreActions(!showMoreActions)}
                                    title="More Actions"
                                >
                                    {showMoreActions ? '✕' : '＋'}
                                </button>
                                
                                {showMoreActions && (
                                    <div className="more-actions-tray animate-fade-in-horizontal">
                                        <button
                                            type="button"
                                            className="btn-icon ai-chat-btn"
                                            onClick={(e) => { handleSmartReplies(e); setShowMoreActions(false); }}
                                            title="AI reply ideas"
                                            disabled={aiReplyLoading}
                                        >
                                            AI
                                        </button>
                                        <button
                                            type="button"
                                            className="btn-icon"
                                            onClick={() => { document.getElementById('chat-image-input').click(); setShowMoreActions(false); }}
                                            title="Send Image"
                                        >
                                            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                                                <circle cx="12" cy="13" r="4"></circle>
                                            </svg>
                                        </button>
                                        <button
                                            type="button"
                                            className="btn-icon"
                                            onClick={() => { setShowGifts(!showGifts); setShowMoreActions(false); }}
                                            title="Send Gift"
                                        >
                                            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20 12 20 22 4 22 4 12"></polyline>
                                                <rect x="2" y="7" width="20" height="5"></rect>
                                                <line x1="12" y1="22" x2="12" y2="7"></line>
                                                <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
                                                <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
                                            </svg>
                                        </button>
                                    </div>
                                )}

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
                                    <input type="text" className="chat-input" placeholder="Message" value={newMessage} onChange={e => { setNewMessage(e.target.value); handleTyping(); }} />
                                </div>

                                <div className="chat-send-actions">
                                    {newMessage.trim() ? (
                                        <button type="submit" className="btn-send">
                                            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="22" y1="2" x2="11" y2="13"></line>
                                                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                            </svg>
                                        </button>
                                    ) : (
                                        <VoiceRecorder onRecordingComplete={handleVoiceStop} isSending={sending} variant="chat" />
                                    )}
                                </div>
                            </form>

                            {showStickers && <StickerDrawer onSelectSticker={handleStickerSelect} onClose={() => setShowStickers(false)} />}
                        </div>
                    </>
                ) : (
                    <div className="chat-dashboard animate-fade-in">
                        <div className="dashboard-header-premium">
                            <div className="dashboard-icon-ring"><span className="icon-main">💬</span></div>
                            <h2>Your Conversations</h2>
                            <p>Pick up where you left off or start something new</p>
                        </div>
                        {conversations.length > 0 ? (
                            <div className="dashboard-sections">
                                {conversations.some(c => !c.last_message) && (
                                    <section className="dashboard-section new-matches-section">
                                        <h3 className="section-label">✨ New Matches</h3>
                                        <div className="new-matches-row">
                                            {conversations.filter(c => !c.last_message).slice(0, 5).map(conv => (
                                                <div key={conv.id} className="new-match-avatar-card" onClick={() => setSelectedConv(conv)}>
                                                    <div className="avatar-ring"><img src={conv.other_user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${conv.id}`} alt={conv.other_user?.full_name} /></div>
                                                    <span className="match-name">{conv.other_user?.full_name?.split(' ')[0]}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}
                                <section className="dashboard-section recent-chats-section">
                                    <h3 className="section-label">🕒 Recent Chats</h3>
                                    <div className="recent-chats-grid">
                                        {conversations.filter(c => c.last_message).slice(0, 6).map(conv => (
                                            <div key={conv.id} className="recent-chat-card glass" onClick={() => setSelectedConv(conv)}>
                                                <img src={conv.other_user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${conv.id}`} alt={conv.other_user?.full_name} className="card-avatar" />
                                                <div className="card-info"><span className="card-name">{conv.other_user?.full_name}</span><p className="card-last-msg">{conv.last_message}</p></div>
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
        </div>
    );
}
