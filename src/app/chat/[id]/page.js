'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ChatConversationPage() {
    const router = useRouter();
    const params = useParams();
    const conversationId = params.id;
    const supabase = createClient();
    const [currentUser, setCurrentUser] = useState(null);
    const [otherUser, setOtherUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [showPhone, setShowPhone] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        loadConversation();
    }, [conversationId]);

    const [isTyping, setIsTyping] = useState(false);
    const typingTimeoutRef = useRef(null);

    useEffect(() => {
        // Subscribe to realtime messages & typing
        const channel = supabase
            .channel(`conversation-${conversationId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${conversationId}`,
                },
                (payload) => {
                    setMessages((prev) => [...prev, payload.new]);
                    // If message is from other user, verify read immediately
                    if (payload.new.sender_id !== currentUser?.id) {
                        supabase
                            .from('messages')
                            .update({ is_read: true })
                            .eq('id', payload.new.id);
                    }
                    scrollToBottom();
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE', // Listen for read receipts
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${conversationId}`,
                },
                (payload) => {
                    setMessages((prev) => prev.map(m => m.id === payload.new.id ? payload.new : m));
                }
            )
            .on('broadcast', { event: 'typing' }, (payload) => {
                if (payload.sender_id !== currentUser?.id) {
                    setIsTyping(true);
                    // Clear existing timeout
                    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                    // Set new timeout to hide indicator
                    typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [conversationId, currentUser]); // Added currentUser to dep to avoid stale closure

    const handleTyping = async () => {
        if (!newMessage) {
            await supabase.channel(`conversation-${conversationId}`).send({
                type: 'broadcast',
                event: 'typing',
                payload: { sender_id: currentUser.id }
            });
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const loadConversation = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push('/auth/login'); return; }

            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            setCurrentUser(profile);

            // Get conversation
            const { data: convo } = await supabase
                .from('conversations')
                .select('*')
                .eq('id', conversationId)
                .single();

            if (!convo) { router.push('/chat'); return; }

            // Get other user
            const otherId = convo.participant_1 === user.id ? convo.participant_2 : convo.participant_1;
            const { data: other } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', otherId)
                .single();

            setOtherUser(other);

            // Load messages
            const { data: msgs } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true });

            setMessages(msgs || []);

            // Mark messages as read
            await supabase
                .from('messages')
                .update({ is_read: true })
                .eq('conversation_id', conversationId)
                .neq('sender_id', user.id);

            scrollToBottom();
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const msg = newMessage.trim();
        setNewMessage('');

        try {
            await supabase.from('messages').insert({
                conversation_id: conversationId,
                sender_id: currentUser.id,
                content: msg,
            });

            // Update conversation last message
            await supabase
                .from('conversations')
                .update({
                    last_message: msg,
                    last_message_at: new Date().toISOString(),
                })
                .eq('id', conversationId);
        } catch (err) {
            console.error('Send error:', err);
        }
    };

    const formatTime = (dateStr) => {
        return new Date(dateStr).toLocaleTimeString('en-NG', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                background: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border)',
            }}>
                <button
                    onClick={() => router.push('/chat')}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-primary)',
                        fontSize: '1.3rem',
                        cursor: 'pointer',
                        padding: '4px',
                    }}
                >
                    ←
                </button>
                <img
                    src={otherUser?.avatar_url || '/placeholder-avatar.png'}
                    alt=""
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2px solid var(--border)',
                    }}
                />
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                        {otherUser?.full_name}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        {otherUser?.university}
                    </div>
                </div>
                <button
                    onClick={() => setShowPhone(!showPhone)}
                    style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-secondary)',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-full)',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                    }}
                >
                    📞 {showPhone && otherUser?.phone ? otherUser.phone : 'Show Number'}
                </button>
            </div>

            {/* Messages */}
            <div className="messages-container" style={{ padding: '16px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {messages.length === 0 && (
                    <div style={{
                        textAlign: 'center',
                        padding: '40px 20px',
                        color: 'var(--text-muted)',
                    }}>
                        <div style={{ fontSize: '2rem', marginBottom: '8px' }}>👋</div>
                        <p>Say hello to {otherUser?.full_name}!</p>
                    </div>
                )}
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={msg.sender_id === currentUser?.id ? 'chat-bubble-sent' : 'chat-bubble-received'}
                    >
                        <div className="chat-bubble-content">
                            {msg.content}
                            <div className="chat-bubble-meta">
                                {formatTime(msg.created_at)}
                                {msg.sender_id === currentUser?.id && (
                                    <span>{msg.is_read ? '✓✓' : '✓'}</span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {isTyping && (
                    <div className="typing-indicator">
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            <form onSubmit={sendMessage} className="chat-input-bar">
                <input
                    type="text"
                    className="chat-input"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => {
                        setNewMessage(e.target.value);
                        handleTyping();
                    }}
                />
                <button type="submit" className="chat-send-btn" disabled={!newMessage.trim()}>
                    ➤
                </button>
            </form>
        </div>
    );
}
