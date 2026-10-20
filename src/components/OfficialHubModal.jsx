import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import OfficialAccountBadge from './OfficialAccountBadge';
import OfficialVideoPlayer from './OfficialVideoPlayer';
import brandIcon from '../assets/landing-brand-icon.webp';
import {
    OFFICIAL_CATEGORIES,
    getOfficialPosts,
    incrementOfficialPostView,
    isValidDeepLink,
} from '../services/officialService';
import './OfficialHubModal.css';

/**
 * OfficialHubModal
 * The official in-app educational and communication hub for The College Date.
 * Allows university students to learn how swiping, matching, requests, chat,
 * 11-benefit premium, and student wallet earnings work with low-data vertical video tutorials.
 */
export default function OfficialHubModal({
    isOpen,
    onClose,
    initialCategory = 'all',
    initialPostId = null,
}) {
    const navigate = useNavigate();
    const [category, setCategory] = useState(initialCategory || 'all');
    const [posts, setPosts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeReelPost, setActiveReelPost] = useState(null);

    // Sync initialCategory when modal opens
    useEffect(() => {
        if (isOpen && initialCategory) {
            setCategory(initialCategory);
        }
    }, [isOpen, initialCategory]);

    // Fetch official posts whenever category changes
    useEffect(() => {
        if (!isOpen) return;

        let isMounted = true;
        setIsLoading(true);

        getOfficialPosts(category)
            .then(({ posts: fetchedPosts }) => {
                if (!isMounted) return;
                setPosts(fetchedPosts);
                setIsLoading(false);

                // If initialPostId requested, open directly into reel mode
                if (initialPostId) {
                    const match = fetchedPosts.find(p => p.id === initialPostId);
                    if (match) setActiveReelPost(match);
                }
            })
            .catch(err => {
                console.warn('[OfficialHubModal] Failed to load posts:', err);
                if (isMounted) setIsLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [isOpen, category, initialPostId]);

    // Handle escape key and body scroll lock
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (activeReelPost) {
                    setActiveReelPost(null);
                } else {
                    onClose?.();
                }
            }
        };

        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = originalOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, activeReelPost, onClose]);

    if (!isOpen) return null;

    const handleActionClick = (deepLink) => {
        if (!deepLink) return;
        onClose?.();
        if (isValidDeepLink(deepLink)) {
            navigate(deepLink);
        } else {
            navigate('/match');
        }
    };

    const handleOpenReel = (post) => {
        setActiveReelPost(post);
    };

    const handleReelNav = (direction) => {
        if (!activeReelPost || posts.length === 0) return;
        const currentIndex = posts.findIndex(p => p.id === activeReelPost.id);
        if (currentIndex === -1) return;

        let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
        if (nextIndex < 0) nextIndex = posts.length - 1;
        if (nextIndex >= posts.length) nextIndex = 0;

        setActiveReelPost(posts[nextIndex]);
    };

    const formatDuration = (secs) => {
        if (!secs) return '0:20';
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const activeReelIndex = activeReelPost ? posts.findIndex(p => p.id === activeReelPost.id) : -1;

    const modalContent = (
        <div
            className="official-hub-overlay"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose?.();
                }
            }}
        >
            <div className="official-hub-container" role="dialog" aria-modal="true">
                {/* Mode 1: Video Reel Viewer Mode */}
                {activeReelPost ? (
                    <div className="official-reel-container">
                        <div className="official-reel-header">
                            <button
                                className="official-reel-back-btn"
                                onClick={() => setActiveReelPost(null)}
                                title="Back to Guides"
                                aria-label="Back to Guides"
                            >
                                ←
                            </button>
                            <span className="official-reel-counter">
                                {activeReelIndex + 1} of {posts.length}
                            </span>
                            <button
                                className="official-hub-close-btn"
                                onClick={onClose}
                                title="Close Hub"
                                aria-label="Close Hub"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="official-reel-stage">
                            {posts.length > 1 && (
                                <button
                                    className="official-reel-nav-btn prev"
                                    onClick={() => handleReelNav('prev')}
                                    title="Previous Tutorial"
                                    aria-label="Previous Tutorial"
                                >
                                    ‹
                                </button>
                            )}

                            <OfficialVideoPlayer
                                videoUrl={activeReelPost.video_url}
                                thumbnailUrl={activeReelPost.thumbnail_url}
                                title={activeReelPost.title}
                                durationSeconds={activeReelPost.duration_seconds}
                                onPlay={() => incrementOfficialPostView(activeReelPost.id)}
                            />

                            {posts.length > 1 && (
                                <button
                                    className="official-reel-nav-btn next"
                                    onClick={() => handleReelNav('next')}
                                    title="Next Tutorial"
                                    aria-label="Next Tutorial"
                                >
                                    ›
                                </button>
                            )}
                        </div>

                        <div className="official-reel-footer">
                            <div className="official-reel-title-row">
                                <h3 className="official-reel-title">{activeReelPost.title}</h3>
                                <OfficialAccountBadge size="small" />
                            </div>
                            <p className="official-reel-caption">{activeReelPost.caption}</p>
                            <div className="official-reel-cta-bar">
                                <span style={{ color: '#94a3b8', fontSize: '0.74rem' }}>
                                    👁 {activeReelPost.view_count || 0} students viewed
                                </span>
                                {activeReelPost.action_deep_link && (
                                    <button
                                        className="official-cta-btn"
                                        onClick={() => handleActionClick(activeReelPost.action_deep_link)}
                                    >
                                        <span>{activeReelPost.action_label || 'Try It Now'}</span>
                                        <span>→</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Mode 2: Hub Overview Mode */
                    <>
                        <div className="official-hub-header">
                            <div className="official-hub-brand">
                                <div className="official-hub-avatar">
                                    <img
                                        src={brandIcon}
                                        alt="The College Date"
                                        className="official-hub-logo-img"
                                    />
                                </div>
                                <div className="official-hub-titles">
                                    <div className="official-hub-title-row">
                                        <h2 className="official-hub-title">The College Date</h2>
                                        <OfficialAccountBadge size="medium" />
                                    </div>
                                    <p className="official-hub-subtitle">
                                        Official verified guides, video tutorials & campus product updates
                                    </p>
                                </div>
                            </div>
                            <button
                                className="official-hub-close-btn"
                                onClick={onClose}
                                title="Close Hub"
                                aria-label="Close Hub"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Category filter pills */}
                        <div className="official-categories-bar">
                            {OFFICIAL_CATEGORIES.map(cat => (
                                <button
                                    key={cat.id}
                                    className={`official-category-pill ${category === cat.id ? 'active' : ''}`}
                                    onClick={() => setCategory(cat.id)}
                                >
                                    <span>{cat.icon}</span>
                                    <span>{cat.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Posts feed */}
                        <div className="official-hub-body">
                            {isLoading ? (
                                <div style={{ textAlign: 'center', padding: '40px 16px', color: '#94a3b8' }}>
                                    <div style={{ fontSize: '1.6rem', marginBottom: '8px' }}>⏳</div>
                                    <div>Loading official tutorials...</div>
                                </div>
                            ) : posts.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px 16px', color: '#94a3b8' }}>
                                    <div style={{ fontSize: '1.6rem', marginBottom: '8px' }}>📚</div>
                                    <div>No guides found for this category yet. Check back soon!</div>
                                </div>
                            ) : (
                                posts.map(post => (
                                    <div key={post.id} className="official-post-card">
                                        <div
                                            className="official-post-media-wrap"
                                            onClick={() => handleOpenReel(post)}
                                        >
                                            <img
                                                src={post.thumbnail_url}
                                                alt={post.title}
                                                className="official-post-thumb"
                                                loading="lazy"
                                                onError={(e) => {
                                                    // Neutral fallback if local asset missing
                                                    e.currentTarget.style.display = 'none';
                                                    e.currentTarget.parentElement.style.background = 'var(--bg-tertiary, #18181f)';
                                                }}
                                            />
                                            <div className="official-post-play-badge">
                                                <div className="official-play-circle">
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: '2px' }}>
                                                        <path d="M8 5v14l11-7z" />
                                                    </svg>
                                                </div>
                                            </div>
                                            <span className="official-duration-badge">
                                                {formatDuration(post.duration_seconds)}
                                            </span>
                                            {post.is_pinned && (
                                                <span className="official-pinned-ribbon">
                                                    <span>📌</span>
                                                    <span>FEATURED</span>
                                                </span>
                                            )}
                                        </div>

                                        <div className="official-post-details">
                                            <div className="official-post-meta-row">
                                                <span className="official-category-tag">
                                                    {OFFICIAL_CATEGORIES.find(c => c.id === post.category)?.label || post.category}
                                                </span>
                                                <span className="official-views-tag">
                                                    👁 {post.view_count || 0} views
                                                </span>
                                            </div>

                                            <h3 className="official-post-title">{post.title}</h3>
                                            <p className="official-post-caption">{post.caption}</p>

                                            <div className="official-post-actions-row">
                                                <button
                                                    className="official-watch-btn"
                                                    onClick={() => handleOpenReel(post)}
                                                >
                                                    <span>▶</span>
                                                    <span>Watch Guide</span>
                                                </button>

                                                {post.action_deep_link && (
                                                    <button
                                                        className="official-cta-btn"
                                                        onClick={() => handleActionClick(post.action_deep_link)}
                                                    >
                                                        <span>{post.action_label || 'Try Now'}</span>
                                                        <span>→</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );

    if (typeof document === 'undefined') return null;
    return createPortal(modalContent, document.body);
}
