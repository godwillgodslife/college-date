import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './ConfessionDrawer.css';
import useSWR, { mutate } from 'swr';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { toggleCommentLike, getUserCommentLikes } from '../services/confessionService';
import { getFreshAvatarUrl } from '../utils/profileData';
import { isEliteUltra } from '../utils/premium';

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

export default function ConfessionDrawer({ post, onClose, onCommentAdded }) {
    const { currentUser } = useAuth();
    const { addToast } = useToast();
    const [comment, setComment] = useState('');
    const [sending, setSending] = useState(false);
    const [likedCommentIds, setLikedCommentIds] = useState(new Set());
    const commentsEndRef = useRef(null);
    const inputRef = useRef(null);

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

    // Load liked comments for the current user
    useEffect(() => {
        if (!currentUser?.id || !comments || !comments.length) return;
        const commentIds = comments.map(c => c.id);
        getUserCommentLikes(commentIds, currentUser.id)
            .then(setLikedCommentIds)
            .catch(() => {});
    }, [comments, currentUser?.id]);

    // Realtime subscription for cross-user live comments
    useEffect(() => {
        if (!post?.id) return;
        const channel = supabase
            .channel(`confession_comments:${post.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'confession_comments',
                    filter: `confession_id=eq.${post.id}`
                },
                (payload) => {
                    const newComment = payload.new;
                    if (!newComment) return;
                    mutate(
                        ['confession_comments', post.id],
                        (current) => {
                            if (!current) return [newComment];
                            if (current.some(c => c.id === newComment.id)) return current;
                            return [...current, newComment];
                        },
                        false
                    );
                    if (typeof onCommentAdded === 'function') {
                        onCommentAdded(post.id);
                    }
                    setTimeout(() => {
                        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                    }, 80);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [post?.id, onCommentAdded]);

    // Handle Android hardware back button
    useEffect(() => {
        let listenerHandle = null;
        if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()) {
            import('@capacitor/app').then(({ App }) => {
                App.addListener('backButton', () => {
                    onClose();
                }).then(h => {
                    listenerHandle = h;
                });
            }).catch(() => {});
        }

        return () => {
            if (listenerHandle) {
                listenerHandle.remove?.();
            }
        };
    }, [onClose]);

    const handleToggleCommentLike = async (commentId) => {
        if (!currentUser) return;
        const isLiked = likedCommentIds.has(commentId);
        const delta = isLiked ? -1 : 1;

        setLikedCommentIds(prev => {
            const next = new Set(prev);
            if (isLiked) next.delete(commentId);
            else next.add(commentId);
            return next;
        });

        mutate(['confession_comments', post.id], (current) => {
            if (!current) return current;
            return current.map(c => {
                if (c.id !== commentId) return c;
                return {
                    ...c,
                    like_count: Math.max(0, (c.like_count || 0) + delta)
                };
            });
        }, false);

        await toggleCommentLike(commentId, currentUser.id);
    };

    const handleReplyToComment = (aliasName) => {
        setComment(`@${aliasName} `);
        inputRef.current?.focus();
    };

    const handlePostComment = async () => {
        if (!comment.trim() || !currentUser) return;
        const commentContent = comment.trim();
        setSending(true);
        try {
            const { data, error } = await supabase
                .from('confession_comments')
                .insert({
                    confession_id: post.id,
                    user_id: currentUser.id,
                    content: commentContent
                })
                .select()
                .single();

            if (error) throw error;
            setComment('');
            mutate(['confession_comments', post.id], (current) => {
                if (!current) return [data];
                if (current.some(c => c.id === data.id)) return current;
                return [...current, data];
            }, false);

            if (typeof onCommentAdded === 'function') {
                onCommentAdded(post.id);
            }
            setTimeout(() => {
                commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 60);
        } catch (err) {
            console.error('Comment error:', err);
            addToast('Comment failed', 'error');
        } finally {
            setSending(false);
        }
    };

    const handleAddEmoji = (emojiChar) => {
        if (!inputRef.current) {
            setComment(prev => prev + emojiChar);
            return;
        }
        const input = inputRef.current;
        const start = input.selectionStart ?? comment.length;
        const end = input.selectionEnd ?? comment.length;
        const updated = comment.slice(0, start) + emojiChar + comment.slice(end);
        setComment(updated);
        setTimeout(() => {
            input.focus();
            const nextPos = start + emojiChar.length;
            input.setSelectionRange(nextPos, nextPos);
        }, 10);
    };

    const drawerContent = (
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
                        {!post.is_anonymous && post.author_name && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.75rem' }}>
                                {post.author_avatar ? (
                                    <img src={getFreshAvatarUrl(post.author_avatar, post.author_id) || post.author_avatar} alt={post.author_name} style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #ec4899' }} />
                                ) : (
                                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#ec4899', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                                        {post.author_name.charAt(0)}
                                    </div>
                                )}
                                <div>
                                    <strong style={{ fontSize: '0.9rem', color: '#fff' }}>{post.author_name}</strong>
                                    {post.author_username && <span style={{ fontSize: '0.75rem', opacity: 0.6, marginLeft: '6px', color: '#cbd5e1' }}>@{post.author_username}</span>}
                                </div>
                            </div>
                        )}

                        <p className="drawer-confession-content">{post.content}</p>

                        {post.image_url && (
                            <img src={post.image_url} alt="Post attachment" className="drawer-confession-image" />
                        )}

                        <div style={{ marginTop: '1rem', display: 'flex', gap: '10px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', flexWrap: 'wrap' }}>
                            <span>✨ {post.totalReactions || 0} Reactions</span>
                            <span>•</span>
                            <span>🔁 {post.repostCount || 0} Reposts</span>
                            <span>•</span>
                            <span>👁️ {post.viewCount || 0} Views</span>
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
                                const isLiked = likedCommentIds.has(c.id);
                                const likeCount = c.like_count || 0;
                                const isCommentUltra = Boolean(c.is_ultra || (c.user_id && isEliteUltra({ id: c.user_id, is_ultra: c.is_ultra })));
                                return (
                                    <div key={c.id} className={`comment-card ${isCommentUltra ? 'comment-card-ultra' : ''}`}>
                                        <div className="alias-avatar">{alias.emoji}</div>
                                        <div className="comment-info">
                                            <div className="alias-name">
                                                {alias.name}
                                                {isCommentUltra && <span className="comment-ultra-pill" title="👑⭐ Elite Ultra VIP">👑⭐ Ultra</span>}
                                            </div>
                                            <p className="comment-text">{c.content}</p>
                                            <div className="comment-actions">
                                                <button
                                                    type="button"
                                                    className={`btn-comment-action ${isLiked ? 'liked' : ''}`}
                                                    onClick={() => handleToggleCommentLike(c.id)}
                                                    title="Like comment"
                                                >
                                                    <span>{isLiked ? '❤️' : '🤍'}</span>
                                                    {likeCount > 0 && <span>{likeCount}</span>}
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn-comment-action"
                                                    onClick={() => handleReplyToComment(alias.name)}
                                                    title="Reply to comment"
                                                >
                                                    <span>↩️</span>
                                                    <span>Reply</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={commentsEndRef} style={{ height: '4px' }} />
                    </div>
                </div>

                <div
                    className="comment-input-wrapper"
                    onClick={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onTouchEnd={(e) => e.stopPropagation()}
                >
                    <div className="quick-emoji-drawer-strip">
                        {['❤️', '😂', '🔥', '👀', '💀', '👏', '😮', '🙌'].map((em) => (
                            <button
                                key={em}
                                type="button"
                                className="btn-quick-emoji"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddEmoji(em);
                                }}
                                onTouchStart={(e) => e.stopPropagation()}
                                onTouchEnd={(e) => e.stopPropagation()}
                            >
                                {em}
                            </button>
                        ))}
                    </div>

                    <div className="comment-input-row">
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Spy on this secret..."
                            className="comment-input"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent?.isComposing) {
                                    e.preventDefault();
                                    handlePostComment();
                                }
                            }}
                        />
                        <button
                            type="button"
                            className="btn-send-comment"
                            onClick={handlePostComment}
                            disabled={sending || !comment.trim()}
                        >
                            {sending ? '...' : '↑'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </>
    );

    return typeof document !== 'undefined' ? createPortal(drawerContent, document.body) : drawerContent;
}
