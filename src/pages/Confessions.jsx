import useSWR, { mutate } from 'swr';
import { useState, useRef, memo, useCallback, useMemo, useEffect, lazy, Suspense } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import {
    postConfession,
    addEmojiReaction,
    claimConfession,
    repostConfession,
    uploadConfessionMedia,
    getAnonymousMessages,
    getConfessionById,
    recordConfessionView,
    REACTION_EMOJIS,
    getCampusDailyPrompt
} from '../services/confessionService';
import { useConfessions } from '../hooks/useSWRData';
import { motion, AnimatePresence } from 'framer-motion';
const ConfessionDrawer = lazy(() => import('../components/ConfessionDrawer'));
const AnonymousInboxModal = lazy(() => import('../components/AnonymousInboxModal'));
const ConfessionMediaEditorModal = lazy(() => import('../components/ConfessionMediaEditorModal'));
const ConfessionShareModal = lazy(() => import('../components/ConfessionShareModal'));
const ConfessionStoryModal = lazy(() => import('../components/ConfessionStoryModal'));
const StoryShareModal = lazy(() => import('../components/StoryShareModal'));
import { recordFeedImpressions } from '../services/feedImpressionService';
import { supabase } from '../lib/supabase';
import { getPublicAppUrl } from '../utils/appUrl';
import { getAvatarUrl, getFreshAvatarUrl } from '../utils/profileData';
import { isEliteUltra } from '../utils/premium';
import { detectOffPlatformContact } from '../utils/offPlatformGuard';
import './Confessions.css';

function EmojiBurst({ emoji, x, y, onComplete }) {
    return (
        <motion.div
            initial={{ opacity: 1, scale: 0.5, x: x - 15, y: y - 15 }}
            animate={{ opacity: 0, scale: 2.5, y: y - 120, x: x + (Math.random() * 40 - 20) }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            onAnimationComplete={onComplete}
            style={{
                position: 'fixed',
                left: 0,
                top: 0,
                fontSize: '2.5rem',
                pointerEvents: 'none',
                zIndex: 9999,
                filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.5))'
            }}
        >
            {emoji}
        </motion.div>
    );
}

const getTimeAgo = (d) => {
    const s = Math.floor((Date.now() - new Date(d)) / 1000);
    if (s < 60) return 'Just now';
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    return `${Math.floor(s / 86400)}d`;
};

const ConfessionCard = memo(function ConfessionCard({ post, index, onReact, onClaim, onRepost, onShare, onOpenThread }) {
    const meshClass = `mesh-gradient-${(index % 4) + 1}`;
    const [bursts, setBursts] = useState([]);
    const [showReactionPicker, setShowReactionPicker] = useState(false);
    const pickerRef = useRef(null);

    // Dismiss reaction picker on clicking outside
    useEffect(() => {
        if (!showReactionPicker) return;
        const handleOutside = (e) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target)) {
                setShowReactionPicker(false);
            }
        };
        document.addEventListener('pointerdown', handleOutside);
        return () => document.removeEventListener('pointerdown', handleOutside);
    }, [showReactionPicker]);

    const timeAgo = useMemo(() => getTimeAgo(post.created_at), [post.created_at]);
    const userReactedEmoji = post.userReactions?.[0];

    const handleReactionSelect = (e, emoji) => {
        e.stopPropagation();
        setShowReactionPicker(false);
        const rect = e.currentTarget.getBoundingClientRect();
        setBursts(prev => [...prev, {
            id: Math.random(),
            x: rect.left + (rect.width / 2),
            y: rect.top,
            emoji
        }]);
        onReact(post.id, emoji);
    };

    const isUltraAuthor = Boolean(
        post.is_ultra ||
        (post.user_id && isEliteUltra({ id: post.user_id, is_ultra: post.is_ultra, plan_type: post.plan_type })) ||
        (post.author_id && isEliteUltra({ id: post.author_id, is_ultra: post.is_ultra, plan_type: post.plan_type }))
    );

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -4 }}
            className={`confession-card-premium ${meshClass} ${post.isViral ? 'viral-hot' : ''} ${isUltraAuthor ? 'confession-card-ultra-spotlight' : ''}`}
            onClick={() => onOpenThread(post)}
        >
            <AnimatePresence>
                {bursts.map(b => (
                    <EmojiBurst
                        key={b.id}
                        emoji={b.emoji}
                        x={b.x}
                        y={b.y}
                        onComplete={() => setBursts(prev => prev.filter(item => item.id !== b.id))}
                    />
                ))}
            </AnimatePresence>

            {/* Elite Ultra VIP Spotlight Badge */}
            {isUltraAuthor && (
                <div className="badge-ultra-spotlight" title="👑⭐ Elite Ultra VIP Spotlight">
                    <span>👑⭐ Ultra VIP Spotlight</span>
                </div>
            )}

            {/* Campus Post Author Header */}
            {!post.is_anonymous && post.author_name && (
                <div className="confession-author-header">
                    <div className="confession-avatar-wrap">
                    {post.author_avatar ? (
                        <img src={getFreshAvatarUrl(post.author_avatar, post.author_id) || post.author_avatar} alt={post.author_name} className="confession-author-avatar" />
                    ) : (
                        <div className="confession-author-avatar placeholder">
                            {post.author_name.charAt(0)}
                        </div>
                    )}
                        {isUltraAuthor && <span className="confession-avatar-ultra-beacon" title="👑 Elite Ultra">👑</span>}
                    </div>
                    <div className="confession-author-meta">
                        <span className="confession-author-name">{post.author_name}</span>
                        {isUltraAuthor && <span className="confession-ultra-crown" title="👑⭐ Elite Ultra VIP">👑⭐</span>}
                        {post.author_username && <span className="confession-author-handle">@{post.author_username}</span>}
                    </div>
                    <span className={`confession-campus-badge ${isUltraAuthor ? 'ultra' : ''}`}>
                        {isUltraAuthor ? '👑 Ultra VIP' : 'Campus Post'}
                    </span>
                </div>
            )}

            {post.isViral && (
                <div className="badge-viral">🔥 Trending</div>
            )}

            <p className="confession-body">{post.content}</p>

            {/* Attached Media Photo */}
            {post.image_url && (
                <div className="confession-media-wrapper">
                    <img src={post.image_url} alt="Post attachment" className="confession-media-img" loading="lazy" />
                </div>
            )}

            <div 
                className="action-bar-floating" 
                onClick={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
            >
                <div className="reactions-pill-strip" ref={pickerRef}>
                    {/* Dedicated Reaction Trigger Button */}
                    <button
                        type="button"
                        className={`btn-social-reaction ${userReactedEmoji ? 'active' : ''}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowReactionPicker(prev => !prev);
                        }}
                        onTouchStart={(e) => e.stopPropagation()}
                        onTouchEnd={(e) => e.stopPropagation()}
                        title="React to secret"
                        aria-label="React to secret"
                    >
                        <span>{userReactedEmoji || '🤍'}</span>
                        <span className="reaction-count-text">{post.totalReactions || 0}</span>
                    </button>

                    {/* Floating Reaction Selector Popover (8 emojis) */}
                    <AnimatePresence>
                        {showReactionPicker && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8, y: 8 }}
                                animate={{ opacity: 1, scale: 1, y: -48 }}
                                exit={{ opacity: 0, scale: 0.8, y: 8 }}
                                transition={{ duration: 0.15 }}
                                className="confession-reaction-popover"
                                onClick={(e) => e.stopPropagation()}
                                onTouchStart={(e) => e.stopPropagation()}
                                onTouchEnd={(e) => e.stopPropagation()}
                            >
                                {REACTION_EMOJIS.map((em) => {
                                    const isSelected = post.userReactions?.includes(em);
                                    return (
                                        <button
                                            key={em}
                                            type="button"
                                            className={`popover-emoji-btn ${isSelected ? 'selected' : ''}`}
                                            onClick={(e) => handleReactionSelect(e, em)}
                                            onTouchStart={(e) => e.stopPropagation()}
                                            onTouchEnd={(e) => e.stopPropagation()}
                                        >
                                            {em}
                                        </button>
                                    );
                                })}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Active Reaction Breakdown Badges */}
                    {REACTION_EMOJIS.filter(em => (post.reactionCounts?.[em] || 0) > 0).slice(0, 3).map((emoji) => {
                        const count = post.reactionCounts[emoji];
                        const userReacted = post.userReactions?.includes(emoji);
                        return (
                            <button
                                key={emoji}
                                type="button"
                                className={`btn-social-emoji-breakdown ${userReacted ? 'active' : ''}`}
                                onClick={(e) => handleReactionSelect(e, emoji)}
                                onTouchStart={(e) => e.stopPropagation()}
                                onTouchEnd={(e) => e.stopPropagation()}
                                title={`React ${emoji}`}
                            >
                                <span>{emoji}</span>
                                <span className="emoji-count">{count}</span>
                            </button>
                        );
                    })}
                </div>

                <div 
                    className="social-actions" 
                    style={{ display: 'flex', gap: '6px', alignItems: 'center' }}
                    onClick={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onTouchEnd={(e) => e.stopPropagation()}
                >
                    {/* Repost Button */}
                    <button
                        type="button"
                        className={`btn-social ${post.hasReposted ? 'active' : ''}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            onRepost(post.id);
                        }}
                        onTouchStart={(e) => e.stopPropagation()}
                        onTouchEnd={(e) => e.stopPropagation()}
                        title={post.hasReposted ? 'Undo repost' : 'Repost to profile'}
                        aria-label="Repost"
                    >
                        <span>🔁</span>
                        <span style={{ fontSize: '10px' }}>{post.repostCount || 0}</span>
                    </button>

                    {/* External Share Button */}
                    <button
                        type="button"
                        className="btn-social"
                        onClick={(e) => {
                            e.stopPropagation();
                            onShare(post);
                        }}
                        onTouchStart={(e) => e.stopPropagation()}
                        onTouchEnd={(e) => e.stopPropagation()}
                        title="Share post"
                        aria-label="Share post"
                    >
                        <span>📤</span>
                    </button>

                    {/* Comments Button */}
                    <button
                        type="button"
                        className="btn-social"
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpenThread(post);
                        }}
                        onTouchStart={(e) => e.stopPropagation()}
                        onTouchEnd={(e) => e.stopPropagation()}
                        aria-label="View comments"
                    >
                        <span>💬</span>
                        <span style={{ fontSize: '10px' }}>{post.commentCount || 0}</span>
                    </button>

                    {/* Claim Ownership Button (if anonymous) */}
                    {post.is_anonymous !== false && (
                        <button
                            type="button"
                            className={`btn-social ${post.hasClaimed ? 'active' : ''}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                onClaim(post.id);
                            }}
                            onTouchStart={(e) => e.stopPropagation()}
                            onTouchEnd={(e) => e.stopPropagation()}
                            disabled={post.hasClaimed}
                            aria-label="Claim secret ownership"
                        >
                            <span>{post.hasClaimed ? '✓' : '👀'}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Card Metadata Footer with Views Metric */}
            <div 
                className="confession-card-footer"
                onClick={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
            >
                <div className="confession-footer-left">
                    <span>🎓 {post.university}</span>
                    <span className="footer-dot">•</span>
                    <span>{timeAgo}</span>
                </div>
                <div 
                    className="confession-views-badge" 
                    title={`${post.viewCount || 0} students viewed this secret`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <span>👁 {post.viewCount || 0} views</span>
                </div>
            </div>
        </motion.div>
    );
});

const CONFESSION_CATEGORIES = [
    'General 🙊', 'Crush 💘', 'Lecturers 👨‍🏫', 'Exams 📚', 'Cafeteria 🍔', 'Gist 💬'
];

export default function Confessions() {
    const { currentUser, userProfile } = useAuth();
    const { addToast } = useToast();
    const [searchParams] = useSearchParams();
    const dailyPrompt = useMemo(() => getCampusDailyPrompt(), []);
    const params = useParams();
    const targetConfessionId = searchParams.get('id') || params?.id;

    const [posting, setPosting] = useState(false);
    const [newConfession, setNewConfession] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('General 🙊');
    const [selectedPost, setSelectedPost] = useState(null);
    const isUserUltra = isEliteUltra(userProfile) || isEliteUltra(currentUser);

    // Share & Story modals
    const [shareModalPost, setShareModalPost] = useState(null);
    const [storyModalPost, setStoryModalPost] = useState(null);

    // Virality & Post Types
    const [postType, setPostType] = useState('anonymous_confession'); // 'anonymous_confession' or 'campus_post'
    const [selectedMediaFile, setSelectedMediaFile] = useState(null);
    const [mediaPreviewUrl, setMediaPreviewUrl] = useState(null);
    const [rawSelectedFile, setRawSelectedFile] = useState(null);
    const [showMediaEditor, setShowMediaEditor] = useState(false);
    const [showInboxModal, setShowInboxModal] = useState(false);
    const [showStoryModal, setShowStoryModal] = useState(false);
    const [unreadAskCount, setUnreadAskCount] = useState(0);
    const fileInputRef = useRef(null);

    const askUrl = getPublicAppUrl(`ask/${userProfile?.username || currentUser?.id}`);

    // SWR for confessions using custom hook
    const { data: confessions = [], isLoading, mutate: mutateConfessions } = useConfessions(
        userProfile?.university?.trim(),
        currentUser?.id
    );

    const [visibleCount, setVisibleCount] = useState(15);

    useEffect(() => {
        setVisibleCount(15);
    }, [confessions.length]);

    const visibleConfessions = useMemo(() => confessions.slice(0, visibleCount), [confessions, visibleCount]);
    const visibleConfessionImpressionIds = visibleConfessions.map(post => post.id).join(',');

    useEffect(() => {
        if (!currentUser?.id || !visibleConfessionImpressionIds) return;
        recordFeedImpressions('confession', visibleConfessionImpressionIds.split(','), 'confessions', { limit: 20 });
    }, [currentUser?.id, visibleConfessionImpressionIds]);

    // Record non-inflating view count for visible cards
    useEffect(() => {
        if (!visibleConfessions?.length) return;
        visibleConfessions.forEach(p => {
            recordConfessionView(p.id, currentUser?.id).then(isNew => {
                if (isNew) {
                    mutateConfessions(current => current ? current.map(item => item.id === p.id ? { ...item, viewCount: (item.viewCount || 0) + 1 } : item) : current, false);
                }
            });
        });
    }, [visibleConfessions, currentUser?.id]);

    // Auto-open confession when targetConfessionId is present in URL
    useEffect(() => {
        if (!targetConfessionId) return;
        const found = confessions.find(c => c.id === targetConfessionId);
        if (found) {
            setSelectedPost(found);
        } else {
            getConfessionById(targetConfessionId, currentUser?.id).then(({ data }) => {
                if (data) setSelectedPost(data);
            }).catch(() => {});
        }
    }, [targetConfessionId, confessions, currentUser?.id]);

    // Unread asks counter & subscription
    useEffect(() => {
        if (!currentUser?.id) return;
        getAnonymousMessages(currentUser.id).then(({ data }) => {
            if (data) {
                const unread = data.filter(m => !m.is_read).length;
                setUnreadAskCount(unread);
            }
        }).catch(() => {});

        const askSub = supabase
            .channel(`user_anon_inbox:${currentUser.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'user_anonymous_messages',
                    filter: `recipient_id=eq.${currentUser.id}`
                },
                () => {
                    setUnreadAskCount(prev => prev + 1);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(askSub);
        };
    }, [currentUser?.id]);

    // Sentinel intersection observer for infinite scroll
    const sentinelRef = useRef(null);
    useEffect(() => {
        if (!sentinelRef.current || confessions.length <= visibleCount) return;

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                setVisibleCount(prev => Math.min(confessions.length, prev + 15));
            }
        }, { rootMargin: '250px' });

        observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [confessions.length, visibleCount]);

    const handleReact = useCallback(async (confessionId, emoji) => {
        if (!currentUser) return;

        mutateConfessions((current) => {
            if (!current) return current;
            return current.map(c => {
                if (c.id !== confessionId) return c;
                const alreadyReacted = c.userReactions?.includes(emoji);
                const delta = alreadyReacted ? -1 : 1;
                return {
                    ...c,
                    reactionCounts: {
                        ...c.reactionCounts,
                        [emoji]: Math.max(0, (c.reactionCounts?.[emoji] || 0) + delta)
                    },
                    totalReactions: Math.max(0, c.totalReactions + delta),
                    userReactions: alreadyReacted
                        ? c.userReactions.filter(e => e !== emoji)
                        : [...(c.userReactions || []), emoji]
                };
            });
        }, false);

        const { error } = await addEmojiReaction(confessionId, currentUser.id, emoji);
        if (error) {
            mutateConfessions();
            addToast('Reaction failed', 'error');
        }
    }, [currentUser, mutateConfessions, addToast]);

    const handleClaim = useCallback(async (confessionId) => {
        if (!currentUser) return;

        mutateConfessions((current) => {
            if (!current) return current;
            return current.map(c => c.id === confessionId ? { ...c, hasClaimed: true } : c);
        }, false);

        const { error, alreadyClaimed } = await claimConfession(confessionId, currentUser.id);
        if (error) {
            mutateConfessions();
            addToast('Could not send claim', 'error');
        } else if (!alreadyClaimed) {
            addToast('Anonymous claim sent to the poster 👀', 'success');
        }
    }, [currentUser, mutateConfessions, addToast]);

    const handleRepost = useCallback(async (confessionId) => {
        if (!currentUser) return;

        mutateConfessions((current) => {
            if (!current) return current;
            return current.map(c => {
                if (c.id !== confessionId) return c;
                const wasReposted = c.hasReposted;
                const delta = wasReposted ? -1 : 1;
                return {
                    ...c,
                    hasReposted: !wasReposted,
                    repostCount: Math.max(0, (c.repostCount || 0) + delta)
                };
            });
        }, false);

        const { reposted, error } = await repostConfession(confessionId, currentUser.id);
        if (error) {
            mutateConfessions();
            addToast('Could not update repost', 'error');
        } else {
            addToast(reposted ? 'Reposted to your profile! 🔁' : 'Repost removed', 'success');
        }
    }, [currentUser, mutateConfessions, addToast]);

    const handleSharePost = useCallback((post) => {
        setShareModalPost(post);
    }, []);

    const handleOpenThread = useCallback((post) => {
        setSelectedPost(post);
        recordConfessionView(post.id, currentUser?.id).then(isNew => {
            if (isNew) {
                mutateConfessions(current => current ? current.map(item => item.id === post.id ? { ...item, viewCount: (item.viewCount || 0) + 1 } : item) : current, false);
                setSelectedPost(prev => prev && prev.id === post.id ? { ...prev, viewCount: (prev.viewCount || 0) + 1 } : prev);
            }
        });
    }, [currentUser?.id, mutateConfessions]);

    const handleCommentAdded = useCallback((confessionId) => {
        mutateConfessions((current) => {
            if (!current) return current;
            return current.map(c => c.id === confessionId ? { ...c, commentCount: (c.commentCount || 0) + 1 } : c);
        }, false);
    }, [mutateConfessions]);

    // Media attachment flow
    const handlePhotoSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            addToast('Image too large (max 10MB)', 'error');
            return;
        }
        setRawSelectedFile(file);
        setShowMediaEditor(true);
        e.target.value = '';
    };

    const handleSaveEditedMedia = (editedFile) => {
        setSelectedMediaFile(editedFile);
        setMediaPreviewUrl(URL.createObjectURL(editedFile));
        setShowMediaEditor(false);
    };

    const handleRemoveMedia = () => {
        setSelectedMediaFile(null);
        if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
        setMediaPreviewUrl(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newConfession.trim() && !selectedMediaFile) return;
        if (newConfession.trim()) {
            const offCheck = detectOffPlatformContact(newConfession);
            if (offCheck.blocked) {
                throw new Error('For campus safety, phone numbers and social handles cannot be shared in campus confessions.');
            }
        }
        setPosting(true);
        try {
            let uploadedImageUrl = null;
            if (selectedMediaFile) {
                const { url, error: mediaErr } = await uploadConfessionMedia(selectedMediaFile, currentUser.id);
                if (mediaErr) throw new Error(mediaErr);
                uploadedImageUrl = url;
            }

            const uni = userProfile?.university?.trim() || 'Unknown University';
            const finalContent = selectedCategory !== 'General 🙊' ? `[${selectedCategory}] ${newConfession.trim()}` : newConfession.trim();
            const isAnon = postType !== 'campus_post';

            const { data: newPost, error } = await postConfession(finalContent, uni, currentUser.id, {
                postType,
                isAnonymous: isAnon,
                authorName: isAnon ? null : userProfile?.full_name,
                authorAvatar: isAnon ? null : getAvatarUrl(userProfile),
                authorUsername: isAnon ? null : userProfile?.username,
                imageUrl: uploadedImageUrl
            });
            if (error) throw new Error(error);

            // Optimistically prepend the new confession
            mutateConfessions((current = []) => {
                const optimisticPost = {
                    ...(newPost || {}),
                    id: newPost?.id || `optimistic-${Date.now()}`,
                    content: finalContent,
                    university: uni,
                    created_at: new Date().toISOString(),
                    reactionCounts: { '🔥': 0, '😂': 0, '🙊': 0, '🙏': 0, '😢': 0 },
                    userReactions: [],
                    hasClaimed: false,
                    hasReposted: false,
                    repostCount: 0,
                    totalReactions: 0,
                    commentCount: 0,
                    isViral: false,
                    post_type: postType,
                    is_anonymous: isAnon,
                    author_name: isAnon ? null : userProfile?.full_name,
                    author_avatar: isAnon ? null : getAvatarUrl(userProfile),
                    author_username: isAnon ? null : userProfile?.username,
                    image_url: uploadedImageUrl,
                    is_ultra: isUserUltra
                };
                return [optimisticPost, ...current];
            }, false);

            setNewConfession('');
            handleRemoveMedia();
            addToast(isAnon ? 'Secret posted! 🤫' : 'Campus post published! 👤', 'success');
        } catch (err) {
            addToast('Failed to post: ' + err.message, 'error');
            mutateConfessions();
        } finally {
            setPosting(false);
        }
    };

    return (
        <div className="confessions-premium-wrapper">
            <div className="mesh-bg" />

            <div className="confessions-container">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="confessions-hero"
                >
                    <div className="badge-campus">
                        <span>{userProfile?.university || 'Campus Hub'}</span>
                    </div>
                    <h1 className="hero-title">Campus Secrets</h1>
                    <p className="hero-subtitle">Anonymous. Ephemeral. 100% Student-led.</p>
                </motion.div>

                {/* NGL-Style Anonymous Ask Banner */}
                <div className="ngl-banner-strip">
                    <div className="ngl-banner-left">
                        <span className="ngl-badge-pill">💌 Anonymous Q&A</span>
                        <h3 className="ngl-headline">Receive Anonymous Messages</h3>

                    </div>

                    <div className="ngl-banner-actions">
                        <button
                            type="button"
                            className="btn-ngl-copy"
                            onClick={() => {
                                navigator.clipboard?.writeText(askUrl);
                                addToast('Ask link copied! Share to WhatsApp status 💌', 'success');
                            }}
                            title="Copy link to clipboard"
                        >
                            📋 Copy Link
                        </button>
                        <button
                            type="button"
                            className="btn-ngl-wa"
                            onClick={() => {
                                const text = `Send me anonymous questions & confessions! 🤫 Drop yours here:\n${askUrl}`;
                                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                            }}
                            title="Share to WhatsApp Status"
                        >
                            💬 Status
                        </button>
                        <button
                            type="button"
                            className="btn-ngl-story"
                            onClick={() => setShowStoryModal(true)}
                            title="Generate 9:16 WhatsApp and IG Story Card"
                        >
                            📸 Story Card
                        </button>
                        <button
                            type="button"
                            className="btn-ngl-inbox"
                            onClick={() => {
                                setShowInboxModal(true);
                                setUnreadAskCount(0);
                            }}
                        >
                            📥 Inbox
                            {unreadAskCount > 0 && (
                                <span className="ngl-unread-bubble">{unreadAskCount}</span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Campus Daily Question Banner */}
                {dailyPrompt && (
                    <div className="campus-daily-prompt-card">
                        <div className="daily-prompt-header">
                            <span className="daily-prompt-tag">🔥 Campus Daily Question</span>
                            <span className="daily-prompt-category">{dailyPrompt.category?.toUpperCase()}</span>
                        </div>
                        <p className="daily-prompt-text">{dailyPrompt.question}</p>
                        <button
                            type="button"
                            className="daily-prompt-answer-btn"
                            onClick={() => {
                                setNewConfession(`[Daily Prompt: ${dailyPrompt.question}]\n\n`);
                                const textarea = document.querySelector('.confession-textarea');
                                if (textarea) textarea.focus();
                            }}
                        >
                            ✍️ Answer Prompt
                        </button>
                    </div>
                )}


                {/* Composer Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="input-card-ultimate glass-morph"
                >
                    <form onSubmit={handleSubmit}>
                        {/* Post Type Selector */}
                        <div className="composer-type-row">
                            <button
                                type="button"
                                className={`composer-type-btn ${postType === 'anonymous_confession' ? 'active' : ''}`}
                                onClick={() => setPostType('anonymous_confession')}
                            >
                                <span>🎭 Secret / Meme (Anonymous)</span>
                            </button>
                            <button
                                type="button"
                                className={`composer-type-btn ${postType === 'campus_post' ? 'active' : ''}`}
                                onClick={() => setPostType('campus_post')}
                            >
                                <span>👤 Campus Post (Public)</span>
                            </button>
                        </div>
                        {isUserUltra && (
                            <div className="composer-ultra-indicator" title="👑⭐ Elite Ultra VIP Spotlight Active">
                                <span>👑⭐ <b>Ultra VIP Spotlight Active:</b> Your post appears with Radiant Pink-Gold styling!</span>
                            </div>
                        )}

                        {/* Category Selector */}
                        <div className="confession-category-selector">
                            {CONFESSION_CATEGORIES.map((cat) => (
                                <button
                                    type="button"
                                    key={cat}
                                    className={`category-chip ${selectedCategory === cat ? 'active' : ''}`}
                                    onClick={() => setSelectedCategory(cat)}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        {/* Image Preview if attached */}
                        {mediaPreviewUrl && (
                            <div className="composer-media-preview-box">
                                <img src={mediaPreviewUrl} alt="Attached thumbnail" className="composer-media-thumb" />
                                <button
                                    type="button"
                                    className="btn-remove-media"
                                    onClick={handleRemoveMedia}
                                    title="Remove photo"
                                >
                                    ✕
                                </button>
                            </div>
                        )}

                        <textarea
                            className="ultimate-textarea"
                            placeholder={postType === 'campus_post' ? "Share what's on your mind on campus..." : "What's the tea today?..."}
                            value={newConfession}
                            onChange={(e) => setNewConfession(e.target.value)}
                            maxLength={350}
                        />

                        {/* Hidden file input */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={handlePhotoSelect}
                        />

                        <div className="ultimate-footer">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <button
                                    type="button"
                                    className="btn-add-photo"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    📷 {selectedMediaFile ? 'Change Photo' : 'Add Photo'}
                                </button>
                                <span className="char-count-text">{350 - newConfession.length} chars left</span>
                            </div>

                            <button type="submit" disabled={posting || (!newConfession.trim() && !selectedMediaFile)} className="btn-ultra-premium">
                                {posting ? 'Posting...' : postType === 'campus_post' ? 'Post as Me' : 'Post Secret'}
                            </button>
                        </div>
                    </form>
                </motion.div>

                {isLoading && !confessions.length ? (
                    <div className="confessions-masonry">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="skeleton-card" style={{ marginBottom: '1.25rem' }} />
                        ))}
                    </div>
                ) : confessions.length === 0 ? (
                    <div className="empty-state" style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255,255,255,0.4)' }}>
                        <span style={{ fontSize: '3rem' }}>🙊</span>
                        <h3>No secrets yet...</h3>
                        <p>Be the first to speak up!</p>
                    </div>
                ) : (
                    <>
                        <div className="confessions-masonry">
                            {visibleConfessions.map((post, idx) => (
                                <ConfessionCard
                                    key={post.id}
                                    post={post}
                                    index={idx}
                                    onReact={handleReact}
                                    onClaim={handleClaim}
                                    onRepost={handleRepost}
                                    onShare={handleSharePost}
                                    onOpenThread={handleOpenThread}
                                />
                            ))}
                        </div>
                        {confessions.length > visibleCount && (
                            <div ref={sentinelRef} className="incremental-scroll-sentinel" style={{ height: '20px', margin: '10px 0' }} />
                        )}
                    </>
                )}
            </div>

            <Suspense fallback={null}>
            {/* In-thread Comment Drawer */}
            <AnimatePresence>
                {selectedPost && (
                    <ConfessionDrawer
                        post={selectedPost}
                        onClose={() => setSelectedPost(null)}
                        onCommentAdded={handleCommentAdded}
                    />
                )}
            </AnimatePresence>

            {/* Anonymous Inbox Modal */}
            {showInboxModal && (
                <AnonymousInboxModal
                    currentUser={currentUser}
                    userProfile={userProfile}
                    onClose={() => setShowInboxModal(false)}
                />
            )}

            {/* Photo Crop / Text / Stickers Editor Modal */}
            {showMediaEditor && (
                <ConfessionMediaEditorModal
                    imageFile={rawSelectedFile}
                    onSave={handleSaveEditedMedia}
                    onCancel={() => setShowMediaEditor(false)}
                />
            )}

            {/* Share Sheet Modal */}
            {shareModalPost && (
                <ConfessionShareModal
                    post={shareModalPost}
                    onClose={() => setShareModalPost(null)}
                    onOpenStoryModal={(post) => setStoryModalPost(post)}
                />
            )}

            {/* 9:16 Canvas Story Card Generator Modal */}
            {storyModalPost && (
                <ConfessionStoryModal
                    post={storyModalPost}
                    onClose={() => setStoryModalPost(null)}
                />
            )}

            {/* Viral Anonymous Q&A 9:16 Story Card Generator */}
            {showStoryModal && (
                <StoryShareModal
                    userProfile={userProfile}
                    currentUser={currentUser}
                    onClose={() => setShowStoryModal(false)}
                />
            )}
            </Suspense>
        </div>
    );
}
