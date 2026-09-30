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
import OptimizedImage from '../components/OptimizedImage';
import { ContextualTip, AppGuideModal } from '../components/ContextualGuide';
import MatchCelebration from '../components/MatchCelebration';
import { markRequestsDiscovered } from '../utils/requestsDiscovery';
import './Requests.css';


export default function Requests() {
    const { currentUser, userProfile } = useAuth();
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [matchData, setMatchData] = useState(null);
    const [requests, setRequests] = useState([]);
    const [requestSummary, setRequestSummary] = useState({ total_count: 0, premium: false, upgrade_required: false, free_accepts_remaining: 3, daily_limit: 3, today_accepts_count: 0 });
    const [loading, setLoading] = useState(true);
    const [actioning, setActioning] = useState(null); // ID of request being processed
    const [guideModalOpen, setGuideModalOpen] = useState(false);
    const [guideFeatureId, setGuideFeatureId] = useState('accept_request');
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
                upgrade_required: data.upgrade_required === true,
                free_accepts_remaining: data.free_accepts_remaining ?? (data.premium ? 999 : 3),
                daily_limit: data.daily_limit || 3,
                today_accepts_count: data.today_accepts_count || 0
            };
            const nextItems = data.items || [];

            setRequests(nextItems);
            setRequestSummary(nextSummary);
            setCachedData(['requests', currentUser.id], { items: nextItems, summary: nextSummary }, {
                userId: currentUser.id,
                type: 'requests'
            });
        } catch (err) {
            console.warn('Could not refresh requests:', err?.message || err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (!currentUser) return;

        // Permanently record that user has discovered connection requests
        markRequestsDiscovered(currentUser.id);

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
            const remainingRequests = requests.filter(r => r.id !== swipeId);
            setRequests(remainingRequests);

            const nextFreeAccepts = data?.remaining_accepts !== undefined
                ? data.remaining_accepts
                : Math.max(0, (requestSummary.free_accepts_remaining ?? 3) - 1);

            const nextSummary = {
                ...requestSummary,
                total_count: Math.max(0, (requestSummary.total_count || 1) - 1),
                free_accepts_remaining: nextFreeAccepts
            };
            setRequestSummary(nextSummary);

            // Synchronize persistent cache immediately
            if (currentUser?.id) {
                setCachedData(['requests', currentUser.id], { items: remainingRequests, summary: nextSummary }, {
                    userId: currentUser.id,
                    type: 'requests'
                });
            }
            
            // Trigger High-Fidelity MatchCelebration modal
            const targetId = targetRequest?.swiper_id;
            const matchId = data?.match_id;
            const targetProfile = targetRequest?.swiper;
            
            console.log('[Requests] Accepted. Triggering MatchCelebration:', { targetId, matchId });
            setMatchData({
                ...targetProfile,
                id: targetId,
                match_id: matchId
            });
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
            const remainingRequests = requests.filter(r => r.id !== swipeId);
            setRequests(remainingRequests);

            const nextSummary = {
                ...requestSummary,
                total_count: Math.max(0, (requestSummary.total_count || 1) - 1)
            };
            setRequestSummary(nextSummary);

            if (currentUser?.id) {
                setCachedData(['requests', currentUser.id], { items: remainingRequests, summary: nextSummary }, {
                    userId: currentUser.id,
                    type: 'requests'
                });
            }
        } catch (err) {
            addToast(err.message, 'error');
        } finally {
            setActioning(null);
        }
    };

    return (
        <div className="requests-page animated fadeIn">
            <div className="requests-header">
                <h1>Connection Requests</h1>
                <p>Manage people who want to vibe with you.</p>

                <ContextualTip
                    featureId="accept_request"
                    onLearnMore={(fId) => { setGuideFeatureId(fId); setGuideModalOpen(true); }}
                />
                <ContextualTip
                    featureId="who_liked_me"
                    onLearnMore={(fId) => { setGuideFeatureId(fId); setGuideModalOpen(true); }}
                />
                
                {/* 3 Free Accepts Daily Quota Banner */}
                <div className="requests-quota-banner">
                    {isPremium ? (
                        <div className="requests-quota-pill premium">
                            <span className="quota-crown">👑</span>
                            <span className="quota-label">Unlimited Accepts • Premium Active</span>
                        </div>
                    ) : (
                        <div className="requests-quota-pill freemium">
                            <span className="quota-zap">⚡</span>
                            <span className="quota-label">
                                <strong>{requestSummary.free_accepts_remaining ?? 3} of {requestSummary.daily_limit || 3} Free Accepts Left Today</strong>
                            </span>
                            {(requestSummary.free_accepts_remaining ?? 3) === 0 && (
                                <button className="quota-upgrade-btn" onClick={() => navigate('/premium')}>
                                    Upgrade to Unlimited 👑
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {!isPremium && (
                    <div className="requests-premium-upsell-card" onClick={() => navigate('/premium')}>
                        <div className="upsell-badge-pill">👑 UNLIMITED ACCESS</div>
                        <div className="upsell-content">
                            <div className="upsell-icon">💎</div>
                            <div className="upsell-text">
                                <h3>Never miss a campus connection</h3>
                                <p>Free accounts get 3 daily accepts. Upgrade to Premium for unlimited instant matches and clear admirer photos.</p>
                            </div>
                            <button 
                                className="upsell-cta-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate('/premium');
                                }}
                            >
                                Upgrade Now ⚡
                            </button>
                        </div>
                    </div>
                )}

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

            {loading && !requests.length ? (
                <div className="requests-loading-state" style={{ display: 'flex', justifyContent: 'center', padding: '3rem 1rem' }}>
                    <LoadingSpinner text="Checking connection requests..." />
                </div>
            ) : requestSummary.total_count > 0 ? (
                <div className="requests-grid">
                    {requests.map((req, index) => (
                        <div key={req.id || `${req.created_at}-${index}`} className={`request-card ${req.is_priority ? 'priority' : ''}`}>
                            {req.is_priority && (
                                <div className="priority-badge">💎 PREMIUM</div>
                            )}
                            <div className="request-user">
                                <div className={`user-avatar-small ${req.locked ? 'blurred-freemium' : ''}`}>
                                    {!req.locked && req.swiper?.avatar_url ? (
                                        <OptimizedImage src={req.swiper.avatar_url} alt="Admirer" width={80} />
                                    ) : (
                                        <div className="avatar-placeholder">?</div>
                                    )}
                                    {!req.locked && hasActivePremium(req.swiper) && (
                                        <span className="request-avatar-premium-badge" title="Premium Member">👑</span>
                                    )}
                                </div>
                                <div className={`user-details ${req.locked ? 'blurred-freemium-text' : ''}`}>
                                    <h3>
                                        {req.locked ? 'Hidden Admirer' : req.swiper?.full_name}
                                        {!req.locked && hasActivePremium(req.swiper) && (
                                            <span className="premium-crown" title="Premium Member">👑</span>
                                        )}
                                        {!req.locked && (req.swiper?.is_verified || req.swiper?.photo_verified) && (
                                            <span className="card-verified-tick" title="Photo Verified Student">✓</span>
                                        )}
                                    </h3>
                                    <p>{req.locked ? 'Upgrade to reveal' : req.swiper?.university}</p>
                                </div>
                            </div>

                            {req.message_teaser && (
                                <div className="request-teaser">
                                    <span className="teaser-quote">“</span>
                                    <p>{req.message_teaser}</p>
                                </div>
                            )}

                            {req.locked ? (
                                <div className="request-actions">
                                    <button className="btn-accept" onClick={() => navigate('/premium')}>
                                        Unlock with Premium 👑
                                    </button>
                                </div>
                            ) : (
                                <div className="request-actions">
                                    {!isPremium && (requestSummary.free_accepts_remaining ?? 3) <= 0 ? (
                                        <button className="btn-accept btn-limit" onClick={() => navigate('/premium')}>
                                            Limit Reached • Upgrade to Accept 👑
                                        </button>
                                    ) : (
                                        <>
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
                                        </>
                                    )}
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

            <AppGuideModal
                isOpen={guideModalOpen}
                onClose={() => setGuideModalOpen(false)}
                initialFeatureId={guideFeatureId}
            />

            {/* High-Fidelity Match Celebration */}
            <MatchCelebration
                isOpen={!!matchData}
                matchedProfile={matchData}
                userProfile={userProfile}
                onClose={() => setMatchData(null)}
                onMessage={() => {
                    const cid = matchData?.match_id;
                    const uid = matchData?.id;
                    navigate(cid ? `/chat?chatId=${cid}` : '/chat', { 
                        state: { 
                            openChatWith: uid,
                            matchData: matchData,
                            chatId: cid
                        } 
                    });
                    setMatchData(null);
                }}
            />
        </div>
    );
}
