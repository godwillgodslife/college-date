import { useState, useEffect, useRef, useCallback } from 'react';
import { formatSidebarTimestamp, formatChatTimestamp } from '../utils/formatTimestamp';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    getConversations,
    getMessages,
    sendMessage,
    subscribeToMessages,
    setupPresence,
    updateTypingStatus,
    markMessageAsRead,
    markConversationRead,
    uploadVoiceNote,
    uploadChatImage,
    addReaction,
} from '../services/chatService';
import { compressImage, generateBlurPlaceholder } from '../utils/imageCompressor';
import { getWallet } from '../services/paymentService';
import { sendGift } from '../services/giftService';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToast } from '../components/Toast';
import VoiceRecorder from '../components/ChatVoiceRecorder';
import StickerDrawer from '../components/StickerDrawer';
import GiftStore from '../components/GiftStore';
import MessageReactionBar from '../components/MessageReactionBar';
import './Chat.css';

const ICEBREAKERS = [
    "What's your favorite spot on campus? 🏫",
    "If you could have dinner with one lecturer, who would it be? 🍎",
    "What's the best thing about your course? 📚",
    "Early bird or night owl in the library? 🦉",
    "What's your go-to campus snack? 🍕"
];

import { useConversations } from '../hooks/useSWRData';
import { Virtuoso } from 'react-virtuoso';
import OptimizedImage from '../components/OptimizedImage';

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

export default function Chat() {
    const { currentUser, userProfile } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();
    const location = useLocation();
    const messagesEndRef = useRef(null);
    const messagesTopRef = useRef(null);


    const [selectedConv, setSelectedConv] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [presence, setPresence] = useState({});
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    // SWR for Conversations Sidebar via custom hook
    const { data: conversations = [], isLoading: convsLoading } = useConversations(currentUser?.id);

    const isTypingRef = useRef(false);
    const typingTimeoutRef = useRef(null);
    const presenceChannelRef = useRef(null);

    const [showStickers, setShowStickers] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [showGifts, setShowGifts] = useState(false);
    const [walletBalance, setWalletBalance] = useState(0);
    const [tick, setTick] = useState(0);

    // Reaction bar state
    const [reactionBar, setReactionBar] = useState(null);
    const longPressTimer = useRef(null);

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

    // ── Deep-link check (only when convsRes changes) ─────────
    useEffect(() => {
        if (!conversations.length || selectedConv) return;
        const params = new URLSearchParams(location.search);
        const chatId = params.get('chatId') || location.state?.chatId;
        const openChatWith = location.state?.openChatWith;

        if (chatId) {
            const target = conversations.find(c => c.id === chatId);
            if (target) setSelectedConv(target);
        } else if (openChatWith) {
            const target = conversations.find(c => c.other_user?.id === openChatWith);
            if (target) setSelectedConv(target);
        } else if (window.innerWidth > 768 && conversations.length > 0) {
            setSelectedConv(conversations[0]);
        }
    }, [conversations, location, selectedConv]);

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

    // ── Messages + Presence ─────────────────────
    useEffect(() => {
        if (!selectedConv || !currentUser || !userProfile) return;
        setPage(0);
        setMessages([]);
        loadMessages(selectedConv.id, 0, true);
        markConversationRead(selectedConv.id, currentUser.id);

        const msgSub = subscribeToMessages(
            selectedConv.id,
            (payload) => {
                setMessages(prev => {
                    if (prev.find(m => m.id === payload.id)) return prev;
                    const newMsgs = [...prev, payload];
                    // Cache Limit: 100 messages to save RAM
                    return newMsgs.length > 100 ? newMsgs.slice(-100) : newMsgs;
                });
                if (payload.sender_id !== currentUser.id) {
                    markMessageAsRead(payload.id);
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
    }, [selectedConv, currentUser, userProfile]);

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

        const content = newMessage.trim();
        const optimisticId = `temp-${Date.now()}`;
        const optimisticMsg = {
            id: optimisticId, match_id: selectedConv.id, sender_id: currentUser.id,
            content, type: 'text', metadata: {}, created_at: new Date().toISOString(),
            is_read: false, _pending: true
        };

        setMessages(prev => {
            const newMsgs = [...prev, optimisticMsg];
            return newMsgs.length > 100 ? newMsgs.slice(-100) : newMsgs;
        });
        setNewMessage('');
        setSending(true);
        stopTyping();

        const { data, error } = await sendMessage(selectedConv.id, currentUser.id, content);
        if (error) {
            setMessages(prev => prev.filter(m => m.id !== optimisticId));
            addToast('Failed to send.', 'error');
        } else if (data) {
            setMessages(prev => prev.map(m => m.id === optimisticId ? data : m));
        }
        setSending(false);
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

    const handleVoiceStop = async (blob) => {
        setIsRecording(false);
        setSending(true);
        const { url, error } = await uploadVoiceNote(blob);
        if (error) { addToast('Upload failed', 'error'); setSending(false); return; }
        await sendMessage(selectedConv.id, currentUser.id, url, 'voice');
        setSending(false);
    };

    const handleImageSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !selectedConv) return;
        setSending(true);
        try {
            const placeholder = await generateBlurPlaceholder(file);
            const optimisticId = `temp-${Date.now()}`;
            setMessages(prev => [...prev, {
                id: optimisticId, match_id: selectedConv.id, sender_id: currentUser.id,
                content: URL.createObjectURL(file), type: 'image', metadata: { placeholder },
                created_at: new Date().toISOString(), is_read: false, _pending: true
            }]);

            const compressed = await compressImage(file, { targetSizeKB: 100 });
            const { url, error } = await uploadChatImage(compressed);
            if (error) throw new Error(error);

            const { data } = await sendMessage(selectedConv.id, currentUser.id, url, 'image', { placeholder });
            if (data) setMessages(prev => prev.map(m => m.id === optimisticId ? data : m));
        } catch (err) {
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
        setMessages(prev => [...prev, {
            id: optimisticId, match_id: selectedConv.id, sender_id: currentUser.id,
            content, type, metadata, created_at: new Date().toISOString(), is_read: false, _pending: true
        }]);

        const { data, error } = await sendMessage(selectedConv.id, currentUser.id, content, type, metadata);
        if (error) { setMessages(prev => prev.filter(m => m.id !== optimisticId)); }
        else if (data) { setMessages(prev => prev.map(m => m.id === optimisticId ? data : m)); }
        setSending(false);
    };

    const handleGiftSend = async (gift) => {
        if (!selectedConv?.other_user?.id) { addToast('Recipient ID missing', 'error'); return; }
        setShowGifts(false);
        setSending(true);
        try {
            const { data: txData, error: txError } = await sendGift(currentUser.id, selectedConv.other_user.id, gift.id);
            if (txError) { addToast(txError, 'error'); return; }
            if (txData?.new_balance !== undefined) setWalletBalance(txData.new_balance);

            const optimisticId = `temp-${Date.now()}`;
            const giftMsg = {
                id: optimisticId, match_id: selectedConv.id, sender_id: currentUser.id,
                content: gift.emoji, type: 'gift',
                metadata: { name: gift.name, price: gift.price },
                created_at: new Date().toISOString(), is_read: false, _pending: true
            };
            setMessages(prev => [...prev, giftMsg]);

            const { data, error: msgError } = await sendMessage(
                selectedConv.id, currentUser.id, gift.emoji, 'gift', { name: gift.name, price: gift.price }
            );
            if (msgError) {
                setMessages(prev => prev.filter(m => m.id !== optimisticId));
                addToast('Gift paid, but chat notification failed.', 'warning');
            } else if (data) {
                setMessages(prev => prev.map(m => m.id === optimisticId ? data : m));
                addToast(`Sent ${gift.name}! 🎁`, 'success');
            }
        } catch (err) {
            addToast('Error sending gift.', 'error');
        } finally {
            setSending(false);
        }
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
            case 'voice': return <div className="voice-message"><audio src={msg.content} controls controlsList="nodownload" /></div>;
            case 'image': return (
                <div className="image-message">
                    <OptimizedImage
                        src={msg.content}
                        placeholder={msg.metadata?.placeholder}
                        alt="Chat media"
                        width={250}
                    />
                </div>
            );
            case 'sticker': return <div className="sticker-message"><span className="sticker-emoji-large">{msg.content}</span><span className="sticker-label">{msg.metadata?.label}</span></div>;
            case 'gift': return <div className="gift-message"><div className="gift-animation">🎁</div><span className="gift-emoji-large">{msg.content}</span><span className="gift-label">SENT A {msg.metadata?.name}</span></div>;
            case 'emoji': return <span className="emoji-message-large">{msg.content}</span>;
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

    if (convsLoading && conversations.length === 0) return <LoadingSpinner fullScreen text="Opening messages..." />;

    return (
        <div className="chat-page">
            {reactionBar && <MessageReactionBar position={{ x: reactionBar.x, y: reactionBar.y }} onReact={handleReact} onClose={() => setReactionBar(null)} />}
            {showGifts && <GiftStore onClose={() => setShowGifts(false)} onSend={handleGiftSend} balance={walletBalance} />}

            <div className={`chat-sidebar ${selectedConv ? 'hide' : 'show'}`}>
                <div className="chat-sidebar-header"><h1>Messages</h1></div>
                <div className="conversation-list">
                    {conversations.length === 0 ? (
                        <div className="chat-empty-state"><p>No matches yet.</p></div>
                    ) : (
                        conversations.map((conv) => {
                            const isTypingNow = presence[conv.other_user?.id]?.some(p => p.is_typing);
                            const isOnline = (presence[conv.other_user?.id]?.length || 0) > 0;
                            const isSentByMe = conv.last_message_sender_id === currentUser?.id;
                            const hasUnread = conv.has_unread && selectedConv?.id !== conv.id;
                            const typePrefix = conv.last_message_type === 'voice' ? '🎙️ ' : conv.last_message_type === 'gift' ? '🎁 ' : conv.last_message_type === 'sticker' ? '😊 ' : '';
                            return (
                                <div key={conv.id} className={`conversation-item ${selectedConv?.id === conv.id ? 'active' : ''} ${hasUnread ? 'unread' : ''}`} onClick={() => setSelectedConv(conv)}>
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
                        </div>

                        <div className="messages-container">
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
                                        className={`message-bubble ${msg.sender_id === currentUser.id ? 'message-sent' : 'message-received'} type-${msg.type || 'text'}`}
                                        onMouseDown={e => handleLongPressStart(e, msg.id)}
                                        onTouchStart={e => handleLongPressStart(e, msg.id)}
                                        onMouseUp={handleLongPressEnd}
                                        onTouchEnd={handleLongPressEnd}
                                        style={{}}
                                    >
                                        {renderMessageContent(msg)}
                                        <div className="message-info"><span className="message-time">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span><ReadReceipt msg={msg} isSender={msg.sender_id === currentUser.id} /></div>
                                        {renderReactions(msg)}
                                    </div>
                                )}
                            />
                        </div>

                        <div className="chat-input-area">
                            <input type="file" id="chat-image-input" accept="image/*" hidden onChange={handleImageSelect} />
                            <form className="chat-input-form" onSubmit={handleSendMessage}>
                                <button
                                    type="button"
                                    className="btn-icon"
                                    onClick={() => document.getElementById('chat-image-input').click()}
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
                                <button
                                    type="button"
                                    className="btn-icon"
                                    onClick={() => setShowGifts(!showGifts)}
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
                                <input type="text" className="chat-input" placeholder="Type a message..." value={newMessage} onChange={e => { setNewMessage(e.target.value); handleTyping(); }} />
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
