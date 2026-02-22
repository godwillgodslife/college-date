import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom'; // Add this import
import { useAuth } from '../contexts/AuthContext';
import {
    getConversations,
    getMessages,
    sendMessage,
    subscribeToMessages,
    setupPresence,
    updateTypingStatus,
    markMessageAsRead,
    uploadVoiceNote
} from '../services/chatService';
import { getWallet } from '../services/paymentService'; // Import wallet service
import { sendGift } from '../services/giftService'; // Import gift service
import LoadingSpinner from '../components/LoadingSpinner';
import { useToast } from '../components/Toast';
import VoiceRecorder from '../components/VoiceRecorder';
import StickerDrawer from '../components/StickerDrawer';
import GiftStore from '../components/GiftStore';
import './Chat.css';

const ICEBREAKERS = [
    "What's your favorite spot on campus? 🏫",
    "If you could have dinner with one lecturer, who would it be? 🍎",
    "What's the best thing about your course? 📚",
    "Early bird or night owl in the library? 🦉",
    "What's your go-to campus snack? 🍕"
];

export default function Chat() {
    const { currentUser, userProfile } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate(); // Add navigate
    const messagesEndRef = useRef(null);

    const [conversations, setConversations] = useState([]);
    const [selectedConv, setSelectedConv] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [presence, setPresence] = useState({});

    // Use Ref for typing status to avoid stale closures in setTimeout
    const isTypingRef = useRef(false);
    const [isTyping, setIsTyping] = useState(false); // Keep state for UI if needed locally

    const [showStickers, setShowStickers] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [showGifts, setShowGifts] = useState(false);
    const [walletBalance, setWalletBalance] = useState(1000);

    const typingTimeoutRef = useRef(null);
    const presenceChannelRef = useRef(null);

    // Initial Load: Conversations & Wallet
    useEffect(() => {
        if (currentUser) {
            loadConversations();
            loadWallet();
        }
    }, [currentUser]);

    async function loadWallet() {
        const { data } = await getWallet(currentUser.id);
        if (data) setWalletBalance(data.available_balance);
    }

    // Load Messages & Setup Presence when conversation selected
    useEffect(() => {
        if (selectedConv && currentUser && userProfile) {
            loadMessages(selectedConv.id);

            // Subscribe to real-time message updates
            const msgSubscription = subscribeToMessages(
                selectedConv.id,
                (payload) => {
                    setMessages((prev) => {
                        // Avoid duplicates if insert comes from both local and realtime
                        if (prev.find(m => m.id === payload.id)) return prev;
                        return [...prev, payload];
                    });
                    if (payload.sender_id !== currentUser.id) {
                        markMessageAsRead(payload.id);
                    }
                },
                (payload) => {
                    // Handle message updates (like read receipts)
                    setMessages((prev) => prev.map(m => m.id === payload.id ? payload : m));
                }
            );

            // Setup Presence (Online/Typing) - Use userProfile for display info
            presenceChannelRef.current = setupPresence(
                selectedConv.id,
                currentUser.id,
                userProfile,
                (state) => setPresence(state)
            );

            return () => {
                msgSubscription.unsubscribe();
                if (presenceChannelRef.current) {
                    presenceChannelRef.current.unsubscribe();
                }
                // Reset typing ref on unmount/switch
                isTypingRef.current = false;
                setIsTyping(false);
            };
        }
    }, [selectedConv, currentUser, userProfile]);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Mark existing unread messages as read when joining chat
    useEffect(() => {
        if (selectedConv && messages.length > 0) {
            const unread = messages.filter(m => m.sender_id !== currentUser.id && !m.is_read);
            unread.forEach(m => markMessageAsRead(m.id));
        }
    }, [selectedConv, messages.length]);

    async function loadConversations() {
        setLoading(true);
        const { data, error } = await getConversations(currentUser.id);
        if (error) {
            console.error('Failed to load conversations:', error);
            addToast('Could not load chats.', 'error');
        } else {
            setConversations(data);
            // On mobile, don't auto-select so user stays on conversation list
            const isMobile = window.innerWidth <= 768;
            if (data.length > 0 && !selectedConv && !isMobile) {
                setSelectedConv(data[0]);
            }
        }
        setLoading(false);
    }

    async function loadMessages(matchId) {
        const { data, error } = await getMessages(matchId);
        if (error) {
            console.error('Failed to load messages:', error);
        } else {
            setMessages(data);
        }
    }

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedConv || sending) return;

        const content = newMessage.trim();
        const optimisticId = `temp-${Date.now()}`;

        // Optimistic Update
        const optimisticMsg = {
            id: optimisticId,
            match_id: selectedConv.id,
            sender_id: currentUser.id,
            content: content,
            type: 'text',
            metadata: {},
            created_at: new Date().toISOString(),
            is_read: false
        };
        setMessages(prev => [...prev, optimisticMsg]);

        setNewMessage('');
        setSending(true);
        stopTyping();

        const { data, error } = await sendMessage(selectedConv.id, currentUser.id, content);

        if (error) {
            console.error('Send message failure:', error);
            addToast(error.message || 'Failed to send message.', 'error');
            setNewMessage(content);
            // Remove optimistic message on failure
            setMessages(prev => prev.filter(m => m.id !== optimisticId));
        } else if (data) {
            // Replace optimistic message with real one
            setMessages(prev => prev.map(m => m.id === optimisticId ? data : m));
        }
        setSending(false);
    };

    const handleVoiceStop = async (blob) => {
        setIsRecording(false);
        setSending(true);

        const { url, error: uploadError } = await uploadVoiceNote(blob);
        if (uploadError) {
            addToast('Failed to upload voice note.', 'error');
            setSending(false);
            return;
        }

        const { error: sendError } = await sendMessage(selectedConv.id, currentUser.id, url, 'voice');
        if (sendError) {
            addToast('Failed to send voice note.', 'error');
        }
        setSending(false);
    };

    const handleStickerSelect = async (sticker, type) => {
        setShowStickers(false);
        setSending(true);

        const content = type === 'sticker' ? sticker.emoji : sticker;
        const metadata = type === 'sticker' ? { label: sticker.label } : {};
        const optimisticId = `temp-${Date.now()}`;

        // Optimistic Update
        const optimisticMsg = {
            id: optimisticId,
            match_id: selectedConv.id,
            sender_id: currentUser.id,
            content: content,
            type: type,
            metadata: metadata,
            created_at: new Date().toISOString(),
            is_read: false
        };
        setMessages(prev => [...prev, optimisticMsg]);

        const { data, error } = await sendMessage(
            selectedConv.id,
            currentUser.id,
            content,
            type,
            metadata
        );

        if (error) {
            addToast('Failed to send.', 'error');
            setMessages(prev => prev.filter(m => m.id !== optimisticId));
        } else if (data) {
            setMessages(prev => prev.map(m => m.id === optimisticId ? data : m));
        }
        setSending(false);
    };

    const handleInputChange = (e) => {
        setNewMessage(e.target.value);
        if (!selectedConv || !currentUser || !userProfile) return;

        // Typing logic using Ref to prevent stale closure issues
        if (!isTypingRef.current) {
            isTypingRef.current = true;
            setIsTyping(true);
            updateTypingStatus(presenceChannelRef.current, currentUser.id, userProfile, true);
        }

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        typingTimeoutRef.current = setTimeout(() => {
            stopTyping();
        }, 3000);
    };

    const stopTyping = () => {
        if (isTypingRef.current) {
            isTypingRef.current = false;
            setIsTyping(false);
            if (userProfile) { // Guard against null profile
                updateTypingStatus(presenceChannelRef.current, currentUser.id, userProfile, false);
            }
        }
    };

    const handleGiftSend = async (gift) => {
        console.log('🎁 [Chat.jsx] handleGiftSend triggered with:', gift);
        console.log('🎁 [Chat.jsx] Current User ID:', currentUser?.id);
        console.log('🎁 [Chat.jsx] Recipient User ID:', selectedConv?.other_user?.id);

        if (!selectedConv?.other_user?.id) {
            addToast('Cannot send gift: Recipient ID missing', 'error');
            console.error('🎁 [Chat.jsx] Error: selectedConv.other_user.id is missing!');
            return;
        }

        setShowGifts(false);
        setSending(true);
        const processingToastId = addToast('Processing gift transaction...', 'info');

        try {
            // 1. Process Transaction
            console.log('🎁 [Chat.jsx] Calling sendGift service...');
            const { data: txData, error: txError } = await sendGift(
                currentUser.id,
                selectedConv.other_user.id,
                gift.id
            );

            if (txError) {
                console.error('🎁 [Chat.jsx] sendGift reported error:', txError);
                addToast(txError, 'error');
                setSending(false);
                return;
            }

            console.log('🎁 [Chat.jsx] sendGift SUCCESS:', txData);

            // 2. Update Local Balance (immediately show response)
            if (txData?.new_balance !== undefined) {
                console.log('🎁 [Chat.jsx] Updating local wallet balance to:', txData.new_balance);
                setWalletBalance(txData.new_balance);
            }

            // 3. Send Message to Chat (Optimistically)
            console.log('🎁 [Chat.jsx] Sending gift message to chat...');
            const optimisticId = `temp-${Date.now()}`;
            const giftMsg = {
                id: optimisticId,
                match_id: selectedConv.id,
                sender_id: currentUser.id,
                content: gift.emoji,
                type: 'gift',
                metadata: { name: gift.name, price: gift.price },
                created_at: new Date().toISOString(),
                is_read: false
            };
            setMessages(prev => [...prev, giftMsg]);

            const { data, error: msgError } = await sendMessage(
                selectedConv.id,
                currentUser.id,
                gift.emoji,
                'gift',
                { name: gift.name, price: gift.price }
            );

            if (msgError) {
                console.error('🎁 [Chat.jsx] sendMessage (gift) error:', msgError);
                // Even if message fails, gift was sent!
                addToast('Gift paid for, but chat notification failed.', 'warning');
                setMessages(prev => prev.filter(m => m.id !== optimisticId));
            } else if (data) {
                setMessages(prev => prev.map(m => m.id === optimisticId ? data : m));
                console.log('🎁 [Chat.jsx] Gift message sent successfully!');
                addToast(`Successfully sent ${gift.name}! 🎁✨`, 'success');
            }
        } catch (err) {
            console.error('🎁 [Chat.jsx] CRITICAL EXCEPTION in handleGiftSend:', err);
            addToast('Software error occurred while sending gift.', 'error');
        } finally {
            setSending(false);
            console.log('🎁 [Chat.jsx] handleGiftSend finished.');
        }
    };

    // Helper for Message Content rendering
    const renderMessageContent = (msg) => {
        switch (msg.type) {
            case 'voice':
                return (
                    <div className="voice-message">
                        <audio src={msg.content} controls controlsList="nodownload" />
                    </div>
                );
            case 'sticker':
                return (
                    <div className="sticker-message">
                        <span className="sticker-emoji-large">{msg.content}</span>
                        <span className="sticker-label">{msg.metadata?.label}</span>
                    </div>
                );
            case 'gift':
                return (
                    <div className="gift-message">
                        <div className="gift-animation">🎁</div>
                        <span className="gift-emoji-large">{msg.content}</span>
                        <span className="gift-label">SENT A {msg.metadata?.name}</span>
                    </div>
                );
            case 'snapshot':
                return (
                    <div className="snapshot-message">
                        <div className="snapshot-thumbnail">📸 Snapshot</div>
                        <p className="snapshot-hint">Expires in 24h</p>
                    </div>
                );
            case 'emoji':
                return <span className="emoji-message-large">{msg.content}</span>;
            default:
                return <div className="message-content-text">{msg.content}</div>;
        }
    };

    // Helper for Read Receipt Icons
    const renderReadReceipt = (msg) => {
        if (msg.sender_id !== currentUser.id) return null;
        return (
            <span className={`read-receipt ${msg.is_read ? 'blue' : ''}`}>
                <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12.122 18.232l-5.657-5.657-1.414 1.414 7.071 7.071 11.314-11.314-1.414-1.414zM12.122 15.404L19.192 8.334l-1.414-1.414-7.07 7.071-3.536-3.535-1.414 1.414z" /></svg>
            </span>
        );
    };

    // Derived State: Is the other user online or typing?
    const otherUserId = selectedConv?.other_user?.id;
    const opponentPresences = presence[otherUserId] || [];
    const isOtherOnline = opponentPresences.length > 0;
    const isOtherTyping = opponentPresences.some(p => p.is_typing);

    if (loading) return <LoadingSpinner fullScreen text="Opening messages..." />;

    return (
        <div className="chat-page">
            <div className={`chat-sidebar ${selectedConv ? 'hide' : 'show'}`}>
                <div className="chat-sidebar-header">
                    <h1>Messages</h1>
                </div>
                <div className="conversation-list">
                    {conversations.length === 0 ? (
                        <div className="chat-empty-state">
                            <p>No matches yet. Keep swiping!</p>
                        </div>
                    ) : (
                        conversations.map((conv) => (
                            <div
                                key={conv.id}
                                className={`conversation-item ${selectedConv?.id === conv.id ? 'active' : ''}`}
                                onClick={() => setSelectedConv(conv)}
                            >
                                <div className="avatar-wrapper">
                                    <img
                                        src={conv.other_user?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + conv.id}
                                        alt={conv.other_user?.full_name}
                                        className="conv-avatar"
                                    />
                                    {presence[conv.other_user?.id]?.length > 0 && <span className="online-dot"></span>}
                                </div>
                                <div className="conv-info">
                                    <div className="conv-name">{conv.other_user?.full_name || 'User'}</div>
                                    <div className="conv-last-msg">
                                        {presence[conv.other_user?.id]?.some(p => p.is_typing) ? (
                                            <span className="typing-text">typing...</span>
                                        ) : 'Click to chat'}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="chat-window">
                {selectedConv ? (
                    <>
                        <div className="chat-header">
                            <button className="btn-back-mobile" onClick={() => setSelectedConv(null)}>
                                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2.5" fill="none"><path d="M15 18l-6-6 6-6" /></svg>
                            </button>
                            <div className="chat-header-info">
                                <img
                                    src={selectedConv.other_user?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + selectedConv.id}
                                    alt={selectedConv.other_user?.full_name}
                                    className="chat-header-avatar"
                                    onClick={() => setShowGifts(true)}
                                />
                                <div className="chat-header-name-wrapper">
                                    <span className="chat-header-name">{selectedConv.other_user?.full_name}</span>
                                    <div className="vibe-meter-container">
                                        <div
                                            className="vibe-meter-fill"
                                            style={{ width: `${Math.min((messages.length / 20) * 100, 100)}%` }}
                                        ></div>
                                        <span className="vibe-text">Vibe: {Math.min(Math.floor((messages.length / 20) * 100), 100)}%</span>
                                    </div>
                                    <span className={`status-text ${isOtherOnline ? 'online' : ''}`}>
                                        {isOtherOnline ? 'Online' : (selectedConv.other_user?.last_seen_at ? `Last seen ${new Date(selectedConv.other_user.last_seen_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Offline')}
                                    </span>
                                </div>
                            </div>
                            {isOtherTyping && <div className="typing-indicator">typing...</div>}
                        </div>

                        <div className="messages-container">
                            {messages.length === 0 ? (
                                <div className="chat-empty-state">
                                    <div className="empty-chat-icon">💬</div>
                                    <p>Start the conversation! Say hi to {selectedConv.other_user?.full_name}.</p>
                                    <div className="icebreakers-container">
                                        <p className="icebreaker-title">Try an icebreaker:</p>
                                        <div className="icebreaker-list">
                                            {ICEBREAKERS.map((text, i) => (
                                                <button
                                                    key={i}
                                                    className="icebreaker-chip"
                                                    onClick={() => {
                                                        setNewMessage(text);
                                                        // Focus the input
                                                        document.querySelector('.chat-input')?.focus();
                                                    }}
                                                >
                                                    {text}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`message-bubble ${msg.sender_id === currentUser.id ? 'message-sent' : 'message-received'} type-${msg.type || 'text'}`}
                                    >
                                        <div className="message-body">
                                            {renderMessageContent(msg)}
                                        </div>
                                        <div className="message-meta">
                                            <span className="message-time">
                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            {renderReadReceipt(msg)}
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {showStickers && (
                            <StickerDrawer
                                onSelectSticker={handleStickerSelect}
                                onClose={() => setShowStickers(false)}
                            />
                        )}

                        {showGifts && (
                            <GiftStore
                                onSend={handleGiftSend}
                                onClose={() => setShowGifts(false)}
                                balance={walletBalance}
                            />
                        )}

                        <div className="chat-input-area">
                            <form className="chat-input-form" onSubmit={handleSendMessage}>
                                <button
                                    type="button"
                                    className={`btn-icon btn-attachment ${showStickers ? 'active' : ''}`}
                                    onClick={() => setShowStickers(!showStickers)}
                                >
                                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
                                </button>
                                <button
                                    type="button"
                                    className="btn-icon btn-chat-gift"
                                    onClick={(e) => {
                                        console.log('🎁 Gift button clicked');
                                        e.preventDefault();
                                        setShowGifts(true);
                                    }}
                                    title="Send Gift"
                                >
                                    <span style={{ pointerEvents: 'none' }}>🎁</span>
                                </button>
                                <button
                                    type="button"
                                    className="btn-icon btn-snap-chat"
                                    onClick={() => navigate('/snap', { state: { recipient: selectedConv.other_user } })}
                                    title="Send Snap"
                                >
                                    👻
                                </button>
                                <input
                                    type="text"
                                    className="chat-input"
                                    placeholder="Type a message..."
                                    value={newMessage}
                                    onChange={handleInputChange}
                                    onBlur={stopTyping}
                                />
                                {newMessage.trim() ? (
                                    <button type="submit" className="btn-send" disabled={sending}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="22" y1="2" x2="11" y2="13"></line>
                                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                        </svg>
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        className="btn-icon btn-voice"
                                        onClick={() => setIsRecording(true)}
                                    >
                                        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
                                    </button>
                                )}
                            </form>
                            {isRecording && (
                                <VoiceRecorder
                                    onStop={handleVoiceStop}
                                    onCancel={() => setIsRecording(false)}
                                />
                            )}
                        </div>
                    </>
                ) : (
                    <div className="chat-empty-state">
                        <div className="empty-chat-icon">💬</div>
                        <h2>Your Messages</h2>
                        <p>Select a match to start chatting.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
