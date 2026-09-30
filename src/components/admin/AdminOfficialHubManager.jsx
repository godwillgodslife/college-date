import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import {
    OFFICIAL_CATEGORIES,
    FALLBACK_OFFICIAL_POSTS,
    adminCreateOfficialPost,
    adminUpdateOfficialPost,
    adminDeleteOfficialPost,
    adminTogglePublish,
    adminTogglePin,
} from '../../services/officialService';
import OfficialAccountBadge from '../OfficialAccountBadge';

const POST_TYPES = [
    { value: 'tutorial', label: '🎓 Video Tutorial' },
    { value: 'announcement', label: '📢 Campus Announcement' },
    { value: 'update', label: '🚀 Feature Update' },
    { value: 'safety', label: '🛡️ Safety & Verification' },
    { value: 'feature_guide', label: '💡 Feature Guide' },
];

const INITIAL_FORM = {
    post_type: 'tutorial',
    category: 'getting_started',
    title: '',
    caption: '',
    video_url: '',
    thumbnail_url: '',
    aspect_ratio: '9:16',
    duration_seconds: 20,
    action_label: '',
    action_deep_link: '',
    is_pinned: false,
    display_order: 1,
    is_published: true,
};

export default function AdminOfficialHubManager({ addToast, logAuditAction }) {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPostId, setEditingPostId] = useState(null);
    const [formData, setFormData] = useState(INITIAL_FORM);
    const [saving, setSaving] = useState(false);

    const loadPosts = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('official_posts')
                .select('*')
                .order('is_pinned', { ascending: false })
                .order('display_order', { ascending: true })
                .order('created_at', { ascending: false });

            if (!error && Array.isArray(data) && data.length > 0) {
                setPosts(data);
            } else {
                setPosts(FALLBACK_OFFICIAL_POSTS);
            }
        } catch (err) {
            console.warn('[AdminOfficialHub] Fetch failed, using fallback:', err);
            setPosts(FALLBACK_OFFICIAL_POSTS);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPosts();
    }, [loadPosts]);

    const handleOpenCreate = () => {
        setEditingPostId(null);
        setFormData({
            ...INITIAL_FORM,
            display_order: posts.length + 1,
        });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (post) => {
        setEditingPostId(post.id);
        setFormData({
            post_type: post.post_type || 'tutorial',
            category: post.category || 'getting_started',
            title: post.title || '',
            caption: post.caption || '',
            video_url: post.video_url || '',
            thumbnail_url: post.thumbnail_url || '',
            aspect_ratio: post.aspect_ratio || '9:16',
            duration_seconds: post.duration_seconds || 20,
            action_label: post.action_label || '',
            action_deep_link: post.action_deep_link || '',
            is_pinned: Boolean(post.is_pinned),
            display_order: post.display_order ?? 1,
            is_published: post.is_published !== false,
        });
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.title.trim()) {
            return addToast?.('Title is required', 'error');
        }
        if (!formData.caption.trim()) {
            return addToast?.('Caption is required', 'error');
        }
        if (!formData.thumbnail_url.trim()) {
            return addToast?.('Thumbnail URL is required', 'error');
        }

        setSaving(true);
        try {
            if (editingPostId) {
                await adminUpdateOfficialPost(editingPostId, formData);
                addToast?.('Official post updated successfully! 🎉', 'success');
                logAuditAction?.('official_post_updated', { postId: editingPostId, title: formData.title });
            } else {
                await adminCreateOfficialPost(formData);
                addToast?.('New official post created! 🚀', 'success');
                logAuditAction?.('official_post_created', { title: formData.title, category: formData.category });
            }
            setIsModalOpen(false);
            loadPosts();
        } catch (err) {
            console.error('[AdminOfficialHub] Save failed:', err);
            addToast?.(err.message || 'Failed to save official post', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleTogglePublish = async (post) => {
        const nextState = !post.is_published;
        try {
            await adminTogglePublish(post.id, nextState);
            setPosts(prev => prev.map(p => p.id === post.id ? { ...p, is_published: nextState } : p));
            addToast?.(`Post ${nextState ? 'published' : 'unpublished'}!`, 'success');
            logAuditAction?.('official_post_toggle_publish', { postId: post.id, is_published: nextState });
        } catch (err) {
            addToast?.(err.message || 'Failed to toggle publish', 'error');
        }
    };

    const handleTogglePin = async (post) => {
        const nextState = !post.is_pinned;
        try {
            await adminTogglePin(post.id, nextState);
            setPosts(prev => prev.map(p => p.id === post.id ? { ...p, is_pinned: nextState } : p));
            addToast?.(`Post ${nextState ? 'pinned to top' : 'unpinned'}!`, 'success');
            logAuditAction?.('official_post_toggle_pin', { postId: post.id, is_pinned: nextState });
        } catch (err) {
            addToast?.(err.message || 'Failed to toggle pin', 'error');
        }
    };

    const handleDelete = async (post) => {
        if (!window.confirm(`Are you sure you want to delete "${post.title}"?`)) return;
        try {
            await adminDeleteOfficialPost(post.id);
            setPosts(prev => prev.filter(p => p.id !== post.id));
            addToast?.('Post deleted.', 'info');
            logAuditAction?.('official_post_deleted', { postId: post.id, title: post.title });
        } catch (err) {
            addToast?.(err.message || 'Failed to delete post', 'error');
        }
    };

    return (
        <div className="admin-official-hub-manager" style={{ marginTop: '16px' }}>
            {/* Header / Action Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}>
                        Official Product Hub Posts & Tutorials
                    </h3>
                    <OfficialAccountBadge size="small" />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        className="admin-btn admin-btn-secondary"
                        onClick={loadPosts}
                        disabled={loading}
                    >
                        🔄 Refresh
                    </button>
                    <button
                        className="admin-btn admin-btn-primary"
                        onClick={handleOpenCreate}
                    >
                        ➕ Add New Tutorial / Post
                    </button>
                </div>
            </div>

            {/* Posts Table */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>Loading official posts...</div>
            ) : posts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>No official posts found. Click Add New to create one.</div>
            ) : (
                <div style={{ overflowX: 'auto', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px' }}>
                    <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                <th style={{ padding: '10px 12px' }}>Order</th>
                                <th style={{ padding: '10px 12px' }}>Title & Category</th>
                                <th style={{ padding: '10px 12px' }}>Duration</th>
                                <th style={{ padding: '10px 12px' }}>Deep Link</th>
                                <th style={{ padding: '10px 12px' }}>Views</th>
                                <th style={{ padding: '10px 12px' }}>Status</th>
                                <th style={{ padding: '10px 12px' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {posts.map(post => (
                                <tr key={post.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                                        {post.is_pinned && <span title="Pinned to top" style={{ marginRight: '4px' }}>📌</span>}
                                        <span style={{ color: '#94a3b8' }}>#{post.display_order}</span>
                                    </td>
                                    <td style={{ padding: '10px 12px' }}>
                                        <div style={{ fontWeight: 600, color: '#fff' }}>{post.title}</div>
                                        <div style={{ color: '#38bdf8', fontSize: '0.72rem' }}>
                                            {OFFICIAL_CATEGORIES.find(c => c.id === post.category)?.label || post.category}
                                            <span style={{ color: '#64748b', marginLeft: '6px' }}>({post.post_type})</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '10px 12px', color: '#cbd5e1' }}>
                                        {post.duration_seconds ? `${post.duration_seconds}s` : '—'}
                                    </td>
                                    <td style={{ padding: '10px 12px' }}>
                                        {post.action_deep_link ? (
                                            <span style={{ color: '#00d2ff', fontFamily: 'monospace' }}>
                                                {post.action_deep_link}
                                            </span>
                                        ) : '—'}
                                    </td>
                                    <td style={{ padding: '10px 12px', color: '#cbd5e1' }}>
                                        👁 {post.view_count || 0}
                                    </td>
                                    <td style={{ padding: '10px 12px' }}>
                                        <button
                                            type="button"
                                            onClick={() => handleTogglePublish(post)}
                                            style={{
                                                padding: '3px 8px',
                                                borderRadius: '12px',
                                                fontSize: '0.7rem',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                border: 'none',
                                                background: post.is_published ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                                color: post.is_published ? '#4ade80' : '#f87171',
                                            }}
                                        >
                                            {post.is_published ? 'Published' : 'Draft'}
                                        </button>
                                    </td>
                                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                                        <button
                                            type="button"
                                            onClick={() => handleTogglePin(post)}
                                            className="admin-btn-action"
                                            title={post.is_pinned ? 'Unpin' : 'Pin to top'}
                                            style={{ marginRight: '6px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}
                                        >
                                            {post.is_pinned ? '📌' : '📍'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleOpenEdit(post)}
                                            className="admin-btn-action"
                                            title="Edit"
                                            style={{ marginRight: '6px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(post)}
                                            className="admin-btn-action"
                                            title="Delete"
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}
                                        >
                                            🗑️
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 999999,
                        background: 'rgba(0, 0, 0, 0.85)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px',
                    }}
                >
                    <div
                        style={{
                            background: '#0f172a',
                            border: '1px solid rgba(0, 210, 255, 0.3)',
                            borderRadius: '16px',
                            width: '100%',
                            maxWidth: '600px',
                            maxHeight: '90vh',
                            overflowY: 'auto',
                            padding: '24px',
                            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                            <h3 style={{ margin: 0, color: '#fff', fontSize: '1.15rem' }}>
                                {editingPostId ? 'Edit Official Post' : 'Create New Official Post'}
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>Post Type</label>
                                    <select
                                        className="admin-input"
                                        value={formData.post_type}
                                        onChange={e => setFormData({ ...formData, post_type: e.target.value })}
                                    >
                                        {POST_TYPES.map(t => (
                                            <option key={t.value} value={t.value}>{t.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>Category</label>
                                    <select
                                        className="admin-input"
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    >
                                        {OFFICIAL_CATEGORIES.filter(c => c.id !== 'all').map(c => (
                                            <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>Title</label>
                                <input
                                    className="admin-input"
                                    placeholder="e.g. How Matching Works on Campus"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>Caption / Educational Explanation</label>
                                <textarea
                                    className="admin-input"
                                    rows={4}
                                    placeholder="Explain clearly how the feature works..."
                                    value={formData.caption}
                                    onChange={e => setFormData({ ...formData, caption: e.target.value })}
                                    required
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>Video URL (WebM / MP4)</label>
                                    <input
                                        className="admin-input"
                                        placeholder="/tutorials/tut_matching.webm"
                                        value={formData.video_url}
                                        onChange={e => setFormData({ ...formData, video_url: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>Thumbnail Poster URL</label>
                                    <input
                                        className="admin-input"
                                        placeholder="/tutorials/tut_matching_thumb.webp"
                                        value={formData.thumbnail_url}
                                        onChange={e => setFormData({ ...formData, thumbnail_url: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>Duration (seconds)</label>
                                    <input
                                        type="number"
                                        className="admin-input"
                                        value={formData.duration_seconds}
                                        onChange={e => setFormData({ ...formData, duration_seconds: parseInt(e.target.value, 10) || 0 })}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>Display Order</label>
                                    <input
                                        type="number"
                                        className="admin-input"
                                        value={formData.display_order}
                                        onChange={e => setFormData({ ...formData, display_order: parseInt(e.target.value, 10) || 0 })}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>Aspect Ratio</label>
                                    <select
                                        className="admin-input"
                                        value={formData.aspect_ratio}
                                        onChange={e => setFormData({ ...formData, aspect_ratio: e.target.value })}
                                    >
                                        <option value="9:16">9:16 (Vertical)</option>
                                        <option value="16:9">16:9 (Landscape)</option>
                                        <option value="1:1">1:1 (Square)</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>Action Button Label</label>
                                    <input
                                        className="admin-input"
                                        placeholder="e.g. Start Swiping Now"
                                        value={formData.action_label}
                                        onChange={e => setFormData({ ...formData, action_label: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>Action Deep Link</label>
                                    <input
                                        className="admin-input"
                                        placeholder="e.g. /match or /wallet"
                                        value={formData.action_deep_link}
                                        onChange={e => setFormData({ ...formData, action_deep_link: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '24px', margin: '6px 0' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontSize: '0.84rem', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.is_pinned}
                                        onChange={e => setFormData({ ...formData, is_pinned: e.target.checked })}
                                    />
                                    <span>📌 Pin to Top</span>
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontSize: '0.84rem', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.is_published}
                                        onChange={e => setFormData({ ...formData, is_published: e.target.checked })}
                                    />
                                    <span>✅ Published</span>
                                </label>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                                <button
                                    type="button"
                                    className="admin-btn admin-btn-secondary"
                                    onClick={() => setIsModalOpen(false)}
                                    disabled={saving}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="admin-btn admin-btn-primary"
                                    disabled={saving}
                                >
                                    {saving ? 'Saving...' : editingPostId ? 'Save Changes' : 'Create Post'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
