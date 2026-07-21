import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { acceptRequest, declineRequest } from '../services/swipeService';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import AndroidInstallButton from '../components/AndroidInstallButton';
import { hasActivePremium } from '../utils/premium';
import { CACHE_TTL } from '../lib/cachePolicy';
import { getCachedData, setCachedData } from '../lib/persistentCache';
import './Requests.css';


export default function Requests() {
    const { currentUser, userProfile } = useAuth();
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [requests, setRequests] = useState([]);
    const [requestSummary, setRequestSummary] = useState({ total_count: 0, premium: false, upgrade_required: false });
    const [loading, setLoading] = useState(true);
    const [actioning, setActioning] = useState(null); // ID of request being processed
    const isPremium = requestSummary.premium || hasActivePremium(userProfile);

    async function fetchRequests() {
        if (!requests.length) setLoading(true);
        try {
            const { data, error } = await supabase
                .rpc('get_admirers_secure', { p_limit: 50 });

            if (error) throw error;
            if (!data?.success) throw new Error(data?.error || 'Failed to load requests');

            const nextSummary = {
                total_count: data.total_count || 0,
                premium: data.premium === true,
                upgrade_required: data.upgrade_required === true
            };
            const nextItems = data.items || [];

            setRequests(nextItems);
            setRequestSummary(nextSummary);
            setCachedData(['requests', currentUser.id], { items: nextItems, summary: nextSummary }, {
                userId: currentUser.id,
                type: 'requests'
            });
        } catch (err) {
            console.error('Error fetching requests:', err);
            if (!requests.length) {
                addToast('Failed to load fresh requests. Showing saved data if available.', 'info');
            }
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (!currentUser) return;

        const cached = getCachedData(['requests', currentUser.id], {
            ttlMs: CACHE_TTL.requests,
            allowStale: true
        });
        if (cached) {
            if (Array.isArray(cached)) {
                setRequests(cached);
                setRequestSummary({ total_count: cached.length, premium: hasActivePremium(userProfile), upgrade_required: false });
            } else {
                setRequests(cached.items || []);
                setRequestSummary(cached.summary || { total_count: 0, premium: false, upgrade_required: false });
            }
            setLoading(false);
        }

        fetchRequests();

        // Subscribe to NEW incoming swipes
        const subscription = supabase
            .channel(`incoming_swipes:${currentUser.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'swipes',
                filter: `swiped_id=eq.${currentUser.id}`
            }, (payload) => {
                console.log('New swipe received real-time:', payload.new);
                fetchRequests(); // Refresh list to get swiper profile info
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'swipes',
                filter: `swiped_id=eq.${currentUser.id}`
            }, (payload) => {
                if (payload.new.status !== 'pending') {
                    setRequests(prev => prev.filter(r => r.id !== payload.new.id));
                }
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [currentUser, userProfile]);

    const handleAccept = async (swipeId) => {
        if (!swipeId) {
            navigate('/premium');
            return;
        }

        setActioning(swipeId);
        try {
            const { data, error } = await acceptRequest(swipeId);
            if (error) throw error;
            if (data && !data.success) throw new Error(data.error || 'Failed to accept');

            addToast('Request accepted! Chat unlocked.', 'success');
            const targetRequest = requests.find(r => r.id === swipeId);
            setRequests(prev => prev.filter(r => r.id !== swipeId));
            
            // Redirect to chat with the new match context (Robust strategy)
            const targetId = targetRequest?.swiper_id;
            const matchId = data?.match_id;
            const targetProfile = targetRequest?.swiper;
            
            console.log('[Requests] Accepted. Navigating with:', { targetId, matchId });
            
            setTimeout(() => {
                navigate(matchId ? `/chat?chatId=${matchId}` : '/chat', { 
                    state: { 
                        openChatWith: targetId,
                        matchData: { ...targetProfile, match_id: matchId },
                        chatId: matchId
                    } 
                });
            }, 1000);
        } catch (err) {
            addToast(err.message, 'error');
        } finally {
            setActioning(null);
        }
    };

    const handleDecline = async (swipeId) => {
        if (!swipeId) {
            navigate('/premium');
            return;
        }

        setActioning(swipeId);
        try {
            const { success, error } = await declineRequest(swipeId);
            if (!success) throw new Error(error);

            addToast('Request declined.', 'info');
            setRequests(prev => prev.filter(r => r.id !== swipeId));
        } catch (err) {
            addToast(err.message, 'error');
        } finally {
            setActioning(null);
        }
    };

    if (loading) return <LoadingSpinner fullScreen text="Loading requests..." />;

    return (
        <div className="requests-page animated fadeIn">
            <div className="requests-header">
                <h1>Connection Requests</h1>
                <p>Manage people who want to vibe with you.</p>
                <AndroidInstallButton />
            </div>

            {userProfile?.completion_score < 100 && (
                <div className="completion-nudge-card card-glow" onClick={() => navigate('/profile/edit')}>
                    <div className="nudge-icon">⚠️</div>
                    <div className="nudge-content">
                        <h3>Your profile is {userProfile.completion_score}% complete</h3>
                        <p>Complete it to appear more in discovery.</p>
                    </div>
                </div>
            )}

            {requestSummary.total_count > 0 ? (
                <div className="requests-grid">
                    {requests.map((req, index) => (
                        <div key={req.id || `${req.created_at}-${index}`} className={`request-card ${req.is_priority ? 'priority' : ''}`}>
                            {req.is_priority && (
                                <div className="priority-badge">💎 PREMIUM</div>
                            )}
                            <div className="request-user">
                                <div className={`user-avatar-small ${req.locked || !isPremium ? 'blurred-freemium' : ''}`}>
                                    {!req.locked && req.swiper?.avatar_url ? (
                                        <img src={req.swiper.avatar_url} alt="Admirer" />
                                    ) : (
                                        <div className="avatar-placeholder">?</div>
                                    )}
                                </div>
                                <div className={`user-details ${req.locked || !isPremium ? 'blurred-freemium-text' : ''}`}>
                                    <h3>{req.locked || !isPremium ? 'Hidden Admirer' : req.swiper?.full_name}</h3>
                                    <p>{req.locked || !isPremium ? 'Upgrade to reveal' : req.swiper?.university}</p>
                                </div>
                            </div>

                            {req.message_teaser && (
                                <div className="request-teaser">
                                    <span className="teaser-quote">“</span>
                                    <p>{req.message_teaser}</p>
                                </div>
                            )}

                            {req.locked || !isPremium ? (
                                <div className="request-actions">
                                    <button className="btn-accept" onClick={() => navigate('/premium')}>
                                        Get Premium
                                    </button>
                                </div>
                            ) : (
                                <div className="request-actions">
                                    <button
                                        className="btn-accept"
                                        disabled={actioning === req.id}
                                        onClick={() => handleAccept(req.id)}
                                    >
                                        {actioning === req.id ? '...' : 'Accept'}
                                    </button>
                                    <button
                                        className="btn-decline"
                                        disabled={actioning === req.id}
                                        onClick={() => handleDecline(req.id)}
                                    >
                                        Decline
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="empty-requests">
                    <div className="empty-icon">💌</div>
                    <h2>No pending requests</h2>
                    <p>When someone swipes right on you, they'll appear here!</p>
                </div>
            )}
        </div>
    );
}
