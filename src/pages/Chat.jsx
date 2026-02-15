import { useState, useEffect, useRef } from 'react';
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
import LoadingSpinner from '../components/LoadingSpinner';
import { useToast } from '../components/Toast';
import VoiceRecorder from '../components/VoiceRecorder';
import StickerDrawer from '../components/StickerDrawer';
import GiftStore from '../components/GiftStore';
import './Chat.css';

export default function Chat() {
    const { currentUser, userProfile } = useAuth();
    const { addToast } = useToast();
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

    // Initial Load: Conversations
    useEffect(() => {
        if (currentUser) {
            loadConversations();
        }
    }, [currentUser]);

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
            if (data.length > 0 && !selectedConv) {
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
        setNewMessage('');
        setSending(true);
        stopTyping(); // Stops typing immediately

        const { error } = await sendMessage(selectedConv.id, currentUser.id, content);

        if (error) {
            console.error('Send message failure:', error);
            addToast(error.message || 'Failed to send message.', 'error');
            setNewMessage(content);
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
        const { error } = await sendMessage(
            selectedConv.id,
            currentUser.id,
            type === 'sticker' ? sticker.emoji : sticker,
            type,
            type === 'sticker' ? { label: sticker.label } : {}
        );
        if (error) addToast('Failed to send.', 'error');
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
        setShowGifts(false);
        setSending(true);
        setWalletBalance(prev => prev - gift.price);

        const { error } = await sendMessage(
            selectedConv.id,
            currentUser.id,
            gift.emoji,
            'gift',
            { name: gift.name, price: gift.price }
        );

        if (error) addToast('Failed to send gift.', 'error');
        setSending(false);
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
            <div className={`chat-sidebar ${!selectedConv ? 'show' : ''}`}>
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
