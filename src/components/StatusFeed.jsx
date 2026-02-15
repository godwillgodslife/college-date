import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { recordStatusView, getStatusViewers } from '../services/statusService';
import LoadingSpinner from './LoadingSpinner';
import './StatusFeed.css';

export default function StatusFeed({ statuses, loading, hiddenCount = 0 }) {
    const { currentUser } = useAuth();
    const [viewingStatusId, setViewingStatusId] = useState(null);
    const [viewers, setViewers] = useState([]);
    const [loadingViewers, setLoadingViewers] = useState(false);

    // Record view when a status is rendered (simplified visibility check)
    useEffect(() => {
        if (!statuses || !currentUser) return;

        statuses.forEach(status => {
            if (status.user_id !== currentUser.id) {
                // Record view for others' statuses
                // In a real app, use IntersectionObserver. Here, we assume "rendered in feed" = viewed.
                // To avoid spam, recordStatusView handles duplicate checks via unique constraint.
                recordStatusView(status.id, currentUser.id);
            }
        });
    }, [statuses, currentUser]);

    const handleShowViewers = async (statusId) => {
        if (viewingStatusId === statusId) {
            setViewingStatusId(null);
            return;
        }

        setViewingStatusId(statusId);
        setLoadingViewers(true);
        const { data } = await getStatusViewers(statusId);
        setViewers(data || []);
        setLoadingViewers(false);
    };

    if (loading) {
        return <div className="status-feed-loading"><LoadingSpinner /></div>;
    }

    if (statuses.length === 0 && hiddenCount === 0) {
        return (
            <div className="status-empty-state">
                <p>No recent statuses. Be the first to post! 🚀</p>
            </div>
        );
    }

    return (
        <div className="status-feed">
            {statuses.map(status => {
                const isOwner = currentUser && status.user_id === currentUser.id;

                return (
                    <div key={status.id} className="status-card animated fadeIn">
                        <div className="status-header">
                            <div className="status-user-info">
                                <img
                                    src={status.profiles?.avatar_url || 'https://via.placeholder.com/40'}
                                    alt={status.profiles?.full_name || 'User'}
                                    className="status-avatar"
                                />
                                <div>
                                    <h3 className="status-username">
                                        {status.profiles?.full_name || 'Unknown User'}
                                        {isOwner && <span className="badge-you">(You)</span>}
                                    </h3>
                                    <span className="status-time">
                                        {formatDistanceToNow(new Date(status.created_at), { addSuffix: true })}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="status-image-wrapper">
                            <img
                                src={status.media_url}
                                alt={status.caption || 'Status'}
                                className="status-image"
                            />
                        </div>

                        <div className="status-footer">
                            {status.caption && (
                                <div className="status-caption">
                                    <p>{status.caption}</p>
                                </div>
                            )}

                            {isOwner && (
                                <div className="status-actions-owner">
                                    <button
                                        className="btn-viewers"
                                        onClick={() => handleShowViewers(status.id)}
                                    >
                                        👁️ {viewingStatusId === status.id ? 'Hide Viewers' : 'See Viewers'}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Viewers List (Only for Owner) */}
                        {isOwner && viewingStatusId === status.id && (
                            <div className="status-viewers-list animated fadeIn">
                                {loadingViewers ? (
                                    <div className="viewers-loading"><LoadingSpinner size="small" /></div>
                                ) : viewers.length === 0 ? (
                                    <p className="no-viewers">No views yet.</p>
                                ) : (
                                    <ul className="viewer-items">
                                        {viewers.map(v => (
                                            <li key={v.viewer.id} className="viewer-item">
                                                <img src={v.viewer.avatar_url || 'https://via.placeholder.com/20'} alt="Avatar" />
                                                <span>{v.viewer.full_name}</span>
                                                <span className="view-time">
                                                    {formatDistanceToNow(new Date(v.viewed_at), { addSuffix: true })}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}

            {hiddenCount > 0 && (
                <div className="status-card locked animated pulse infinite-once">
                    <div className="locked-overlay">
                        <div className="locked-icon">🔒</div>
                        <h3>{hiddenCount} Locked {hiddenCount === 1 ? 'Update' : 'Updates'}</h3>
                        <p>Swipe in Discover to unlock hidden content from new connections!</p>
                        <button className="btn-unlock-cta" onClick={() => window.location.href = '/discover'}>
                            Start Swiping
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
