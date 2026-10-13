import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { getAnonymousMessages, deleteAnonymousMessage, markAnonymousMessageRead } from '../services/confessionService';
import AnonymousStoryCardModal from './AnonymousStoryCardModal';
import { getPublicAppUrl } from '../utils/appUrl';
import './AnonymousInboxModal.css';

export default function AnonymousInboxModal({ currentUser, userProfile, onClose }) {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeStoryMessage, setActiveStoryMessage] = useState(null);
    const username = userProfile?.username || currentUser?.id;
    const askUrl = getPublicAppUrl(`ask/${username}`);

    useEffect(() => {
        if (!currentUser?.id) return;
        let isMounted = true;

        async function loadMessages() {
            setLoading(true);
            const { data } = await getAnonymousMessages(currentUser.id);
            if (isMounted) {
                setMessages(data || []);
                setLoading(false);
            }
        }
        loadMessages();

        // Realtime subscription for incoming anonymous asks
        const channel = supabase
            .channel(`anon_asks:${currentUser.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'user_anonymous_messages',
                    filter: `recipient_id=eq.${currentUser.id}`
                },
                (payload) => {
                    const newMsg = payload.new;
                    if (newMsg) {
                        setMessages(prev => [newMsg, ...prev]);
                    }
                }
            )
            .subscribe();

        return () => {
            isMounted = false;
            supabase.removeChannel(channel);
        };
    }, [currentUser?.id]);

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        setMessages(prev => prev.filter(m => m.id !== id));
        await deleteAnonymousMessage(id);
    };

    const handleCopyLink = () => {
        navigator.clipboard?.writeText(askUrl);
        alert('Ask link copied! Paste it on WhatsApp Status or Instagram story 💌');
    };

    const handleWhatsAppShare = () => {
        const text = `Send me anonymous questions & confessions! 🤫 Drop yours here:\n${askUrl}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const modalContent = (
        <div className="inbox-modal-overlay" onClick={onClose}>
            <div className="inbox-modal-card" onClick={(e) => e.stopPropagation()}>
                <div className="inbox-modal-header">
                    <div>
                        <span className="inbox-kicker">Confessions & Q&A</span>
                        <h3>📥 Anonymous Inbox</h3>
                    </div>
                    <button type="button" className="inbox-close-btn" onClick={onClose}>✕</button>
                </div>

                {/* Quick Link Share Bar */}
                <div className="inbox-link-strip">
                    <div className="inbox-link-info">
                        <span className="inbox-link-label">My Ask Link</span>
                        <span className="inbox-link-subtext">Share with friends to get questions</span>
                    </div>
                    <div className="inbox-link-btns">
                        <button type="button" className="btn-inbox-copy" onClick={handleCopyLink} title="Copy link">
                            📋 Copy
                        </button>
                        <button type="button" className="btn-inbox-wa" onClick={handleWhatsAppShare} title="Share to WhatsApp">
                            💬 Status
                        </button>
                    </div>
                </div>

                {/* Messages List */}
                <div className="inbox-messages-list">
                    {loading ? (
                        <div className="inbox-empty-state">
                            <div className="inbox-spinner" />
                            <p>Loading received confessions...</p>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="inbox-empty-state">
                            <span className="empty-emoji">💌</span>
                            <h4>No anonymous messages yet</h4>
                            <p>Share your link on WhatsApp Status or Instagram to start receiving secret confessions from campus!</p>
                            <button type="button" className="btn-empty-share" onClick={handleWhatsAppShare}>
                                Share to WhatsApp Status →
                            </button>
                        </div>
                    ) : (
                        messages.map((msg) => (
                            <div key={msg.id} className="inbox-msg-item">
                                <div className="msg-item-top">
                                    <span className="msg-badge-secret">🤫 Anonymous Secret</span>
                                    <span className="msg-time">
                                        {new Date(msg.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>

                                <p className="msg-item-content">{msg.content}</p>

                                <div className="msg-item-actions">
                                    <button
                                        type="button"
                                        className="btn-share-story"
                                        onClick={() => setActiveStoryMessage(msg)}
                                    >
                                        📸 Share Card to Story / WhatsApp
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-delete-msg"
                                        onClick={(e) => handleDelete(msg.id, e)}
                                        title="Delete message"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Render Story Card Modal when a message is selected for sharing */}
            {activeStoryMessage && (
                <AnonymousStoryCardModal
                    message={activeStoryMessage}
                    username={username}
                    fullName={userProfile?.full_name}
                    onClose={() => setActiveStoryMessage(null)}
                />
            )}
        </div>
    );

    return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
