'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import BottomNav from '@/components/BottomNav';
import Link from 'next/link';

export default function ChatListPage() {
    const router = useRouter();
    const supabase = createClient();
    const { user, profile, loading: authLoading } = useAuth();
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && user && profile) {
            loadConversations();
        }
    }, [authLoading, user, profile]);

    const loadConversations = async () => {
        if (!user || !profile) return;

        try {
            // Get conversations
            const { data: convos } = await supabase
                .from('conversations')
                .select('*')
                .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
                .order('last_message_at', { ascending: false });

            if (convos && convos.length > 0) {
                // Get other participants' profiles
                const otherIds = convos.map((c) =>
                    c.participant_1 === user.id ? c.participant_2 : c.participant_1
                );

                const { data: otherProfiles } = await supabase
                    .from('profiles')
                    .select('id, full_name, avatar_url, university')
                    .in('id', otherIds);

                const profileMap = {};
                (otherProfiles || []).forEach((p) => { profileMap[p.id] = p; });

                const enriched = convos.map((c) => {
                    const otherId = c.participant_1 === user.id ? c.participant_2 : c.participant_1;
                    return { ...c, otherUser: profileMap[otherId] || {} };
                });

                setConversations(enriched);
            }
        } catch (err) {
            console.error('Error loading conversations:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;
        if (diff < 86400000) {
            return date.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
        }
        if (diff < 604800000) {
            return date.toLocaleDateString('en-NG', { weekday: 'short' });
        }
        return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
    };

    if (authLoading || (loading && conversations.length === 0)) {
        return (
            <div className="loading-screen" style={{
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)'
            }}>
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className="page">
            <div className="container">
                <div className="page-header">
                    <h1 className="page-title">Chats</h1>
                </div>

                {conversations.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">💬</div>
                        <h3 className="empty-state-title">No chats yet</h3>
                        <p className="empty-state-desc">
                            Start swiping to match with people and chat!
                        </p>
                        <button
                            className="btn btn-primary"
                            style={{ marginTop: 16 }}
                            onClick={() => router.push('/discover')}
                        >
                            Go to Discover
                        </button>
                    </div>
                ) : (
                    <div className="chat-list">
                        {conversations.map((convo) => (
                            <Link
                                key={convo.id}
                                href={`/chat/${convo.id}`}
                                style={{ textDecoration: 'none', color: 'inherit' }}
                            >
                                <div className="chat-item">
                                    <img
                                        src={convo.otherUser?.avatar_url || '/placeholder-avatar.png'}
                                        alt={convo.otherUser?.full_name}
                                        className="chat-avatar"
                                    />
                                    <div className="chat-info">
                                        <div className="chat-name">{convo.otherUser?.full_name || 'Unknown'}</div>
                                        <div className="chat-preview">
                                            {convo.last_message || 'Start a conversation 👋'}
                                        </div>
                                    </div>
                                    <div className="chat-meta">
                                        <div className="chat-time">{formatTime(convo.last_message_at)}</div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            <BottomNav gender={profile?.gender} />
        </div>
    );
}
