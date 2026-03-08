import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './ConfessionDrawer.css';
import useSWR, { mutate } from 'swr';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';

const CAMPUS_ALIASES = [
    { name: 'Engineering Lion', emoji: '🦁' },
    { name: 'Nursing Queen', emoji: '👑' },
    { name: 'Medical Ninja', emoji: '🥋' },
    { name: 'Law Shark', emoji: '🦈' },
    { name: 'Business Mogul', emoji: '💼' },
    { name: 'Arts Dreamer', emoji: '🎨' },
    { name: 'Tech Wizard', emoji: '🧙‍♂️' },
    { name: 'Campus Gossip', emoji: '🤫' },
    { name: 'Library Ghost', emoji: '👻' },
    { name: 'Vibe Master', emoji: '🕺' }
];

// Helper to get consistent alias for a user per confession
const getAlias = (userId, confessionId) => {
    const seed = (userId + confessionId).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return CAMPUS_ALIASES[seed % CAMPUS_ALIASES.length];
};

export default function ConfessionDrawer({ post, onClose }) {
    const { currentUser } = useAuth();
    const { addToast } = useToast();
    const [comment, setComment] = useState('');
    const [sending, setSending] = useState(false);

    // Fetch comments for this confession
    const { data: comments, error } = useSWR(
        ['confession_comments', post.id],
        async () => {
            const { data, error } = await supabase
                .from('confession_comments')
                .select('*')
                .eq('confession_id', post.id)
                .order('created_at', { ascending: true });
            if (error) throw error;
            return data;
        }
    );

    const handlePostComment = async () => {
        if (!comment.trim() || !currentUser) return;
        setSending(true);
        try {
            const { error } = await supabase
                .from('confession_comments')
                .insert({
                    confession_id: post.id,
                    user_id: currentUser.id,
                    content: comment.trim()
                });
            if (error) throw error;
            setComment('');
            mutate(['confession_comments', post.id]);
        } catch (err) {
            addToast('Comment failed', 'error');
        } finally {
            setSending(false);
        }
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="confession-drawer-overlay"
                onClick={onClose}
            />
            <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="confession-drawer-content"
            >
                <div className="drawer-header">
                    <div className="drawer-drag-handle" />
                    <button className="close-btn" onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                </div>

                <div className="drawer-body">
                    <div className="drawer-confession-highlight">
                        <p className="drawer-confession-content">{post.content}</p>
                        <div style={{ marginTop: '1rem', display: 'flex', gap: '10px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                            <span>✨ {post.totalReactions} Reactions</span>
                            <span>•</span>
                            <span>{post.university}</span>
                        </div>
                    </div>

                    <div className="comments-section">
                        <h4 style={{ color: '#a855f7', marginBottom: '1.5rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Anonymous Thread 💬</h4>

                        {!comments ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.2)' }}>Loading thread...</div>
                        ) : comments.length === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.2)' }}>No comments yet. Start the conversation!</div>
                        ) : (
                            comments.map(c => {
                                const alias = getAlias(c.user_id, post.id);
                                return (
                                    <div key={c.id} className="comment-card">
                                        <div className="alias-avatar">{alias.emoji}</div>
                                        <div className="comment-info">
                                            <div className="alias-name">{alias.name}</div>
                                            <p className="comment-text">{c.content}</p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                <div className="comment-input-wrapper">
                    <input
                        type="text"
                        placeholder="Spy on this secret..."
                        className="comment-input"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
                    />
                    <button
                        className="btn-send-comment"
                        onClick={handlePostComment}
                        disabled={sending || !comment.trim()}
                    >
                        {sending ? '...' : '↑'}
                    </button>
                </div>
            </motion.div>
        </>
    );
}
