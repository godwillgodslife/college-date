import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { acceptRequest, declineRequest } from '../services/swipeService';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import AndroidInstallButton from '../components/AndroidInstallButton';
import { hasActivePremium } from '../utils/premium';
import { getAvatarUrl, calculateProfileStrength, getNextProfileCompletionStep } from '../utils/profileData';
import { CACHE_TTL } from '../lib/cachePolicy';
import { getCachedData, setCachedData } from '../lib/persistentCache';
import OptimizedImage from '../components/OptimizedImage';
import { ContextualTip, AppGuideModal, isGuideSeen, markFeatureUsed } from '../components/ContextualGuide';
import MatchCelebration from '../components/MatchCelebration';
import { markRequestsDiscovered } from '../utils/requestsDiscovery';
import { triggerLightHaptic } from '../services/haptics';
import './Requests.css';


export default function Requests() {
    const { currentUser, userProfile } = useAuth();
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [matchData, setMatchData] = useState(null);
    const [requests, setRequests] = useState([]);
    const [nudgeDismissed, setNudgeDismissed] = useState(() => {
        if (typeof window === 'undefined' || !window.localStorage) return false;
        return window.localStorage.getItem('tcd_nudge_dismissed_profile_completion') === 'true';
    });

    const profileStrength = useMemo(() => {
        return calculateProfileStrength(userProfile, userProfile?.completion_score);
    }, [userProfile]);

    const nextStep = useMemo(() => {
        return getNextProfileCompletionStep(userProfile);
    }, [userProfile]);

    // Re-evaluate dismissal if profile strength changes (e.g. user updated profile)
    useEffect(() => {
        if (typeof window === 'undefined' || !window.localStorage) return;
        const storedScore = window.localStorage.getItem('tcd_nudge_dismissed_profile_score');
        if (storedScore !== null && Number(storedScore) !== profileStrength) {
            setNudgeDismissed(false);
            window.localStorage.removeItem('tcd_nudge_dismissed_profile_completion');
            window.localStorage.removeItem('tcd_nudge_dismissed_profile_score');
        }
    }, [profileStrength]);

    const handleDismissNudge = (e) => {
        e.stopPropagation();
        setNudgeDismissed(true);
        try {
            localStorage.setItem('tcd_nudge_dismissed_profile_completion', 'true');
            localStorage.setItem('tcd_nudge_dismissed_profile_score', String(profileStrength));
        } catch (_) {}
    };
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

        const handlePhotoUpdated = () => {
            fetchRequests();
        };
        window.addEventListener('cd:profile-photo-updated', handlePhotoUpdated);

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
            window.removeEventListener('cd:profile-photo-updated', handlePhotoUpdated);
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
            markFeatureUsed('accept_request');
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
            markFeatureUsed('accept_request');
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
                <div className="requests-section-label">CONNECTIONS</div>
                <h1>Connection Requests</h1>
                <p>Manage people who want to vibe with you.</p>

                {/* Single Contextual Tip Priority: Never stack 2 tips simultaneously */}
                {!isGuideSeen('accept_request') ? (
                    <ContextualTip
                        featureId="accept_request"
                        onLearnMore={(fId) => { setGuideFeatureId(fId); setGuideModalOpen(true); }}
                    />
                ) : !isGuideSeen('who_liked_me') ? (
                    <ContextualTip
                        featureId="who_liked_me"
                        onLearnMore={(fId) => { setGuideFeatureId(fId); setGuideModalOpen(true); }}
                    />
                ) : null}
                
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
                    <div 
                        className="requests-premium-upsell-card" 
                        onClick={() => navigate('/premium')}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                navigate('/premium');
                            }
                        }}
                    >
                        <div className="upsell-content">
                            <div className="upsell-icon-wrapper" aria-hidden="true">
                                <span className="upsell-icon">💎</span>
                            </div>
                            <div className="upsell-text">
                                <div className="upsell-header-line">
                                    <span className="upsell-badge-pill">👑 UNLIMITED ACCESS</span>
                                    <h3>Never miss a campus connection</h3>
                                </div>
                                <p>Free accounts get 3 daily accepts. Upgrade to Premium for unlimited instant matches and clear admirer photos.</p>
                            </div>
                            <button 
                                type="button"
                                className="upsell-cta-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate('/premium');
                                }}
                            >
                                <span>Upgrade Now</span>
                                <span className="btn-bolt" aria-hidden="true">⚡</span>
                            </button>
                        </div>
                    </div>
                )}

                <AndroidInstallButton />
            </div>

            {!nudgeDismissed && Boolean(userProfile) && profileStrength < 80 && (
                <div
                    className={`completion-nudge-card card-glow ${profileStrength < 50 ? 'is-warning' : 'is-progress'}`}
                    onClick={() => navigate('/profile/edit')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            navigate('/profile/edit');
                        }
                    }}
                    title="Tap to finish profile setup"
                    aria-label={`Your profile is ${profileStrength}% complete. Complete it to appear more in discovery.`}
                >
                    <div className="nudge-icon-wrap" aria-hidden="true">
                        <span className="nudge-icon">{profileStrength < 50 ? '⚠️' : '⚡'}</span>
                    </div>

                    <div className="nudge-content">
                        <div className="nudge-header-row">
                            <h3>Your profile is {profileStrength}% complete</h3>
                            <span className="nudge-tier-chip">
                                {profileStrength < 50 ? 'Limited Discovery' : 'Almost Optimised'}
                            </span>
                        </div>

                        <div className="nudge-progress-track" aria-hidden="true">
                            <div
                                className="nudge-progress-bar"
                                style={{ width: `${profileStrength}%` }}
                            />
                        </div>

                        <p>
                            {nextStep ? (
                                <>💡 Next: <strong>{nextStep.label}</strong> ({nextStep.bonus}) to appear more in discovery.</>
                            ) : (
                                <>Complete it to appear more in discovery.</>
                            )}
                        </p>
                    </div>

                    <div className="nudge-actions-wrap">
                        <button
                            type="button"
                            className="btn-nudge-action"
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate('/profile/edit');
                            }}
                        >
                            <span>Finish Setup →</span>
                        </button>

                        <button
                            type="button"
                            className="nudge-dismiss-btn"
                            onClick={handleDismissNudge}
                            aria-label="Dismiss completion reminder"
                            title="Dismiss"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {loading && !requests.length ? (
                <div className="requests-loading-state" style={{ display: 'flex', justifyContent: 'center', padding: '3rem 1rem' }}>
                    <LoadingSpinner text="Checking connection requests..." />
                </div>
            ) : requestSummary.total_count > 0 ? (
                <>
                    <div className="requests-section-label" style={{ marginBottom: '0.75rem' }}>
                        ADMIRERS ({requestSummary.total_count})
                    </div>
                    <div className="requests-grid">
                    {requests.map((req, index) => (
                        <div key={req.id || `${req.created_at}-${index}`} className={`request-card ${req.is_priority ? 'priority' : ''}`}>
                            {req.is_priority && (
                                <div className="priority-badge">💎 PREMIUM</div>
                            )}
                            <div className="request-user">
                                <div style={{ position: 'relative', width: '60px', height: '60px', flexShrink: 0 }}>
                                    <div className={`user-avatar-small ${req.locked ? 'blurred-freemium' : ''}`}>
                                        {(() => {
                                            const swiperAvatar = req.swiper ? (
                                                getAvatarUrl(req.swiper) || (req.swiper.id ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.swiper.id}` : null)
                                            ) : null;
                                            const displayName = req.swiper?.full_name || '';
                                            const isGenericName = !displayName || /^(admirer|secret\s*admirer|viewer|visitor|user|student)$/i.test(displayName.trim());
                                            const initial = !isGenericName && displayName.trim().length > 0 ? displayName.trim().charAt(0).toUpperCase() : '👤';
                                            return !req.locked && swiperAvatar ? (
                                                <OptimizedImage
                                                    src={swiperAvatar}
                                                    alt={!isGenericName ? displayName : "Admirer"}
                                                    width={80}
                                                    height={80}
                                                    priority={true}
                                                    className="admirer-avatar-img"
                                                />
                                            ) : (
                                                <div className="avatar-placeholder">
                                                    {req.locked ? '?' : initial}
                                                </div>
                                            );
                                        })()}
                                    </div>
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

                            {req.message_teaser && (() => {
                                const match = String(req.message_teaser).match(/^\[Replied to ([^\]]+)\]:\s*"?([\s\S]*?)"?$/);
                                if (match) {
                                    return (
                                        <div className="request-teaser request-prompt-reply">
                                            <span className="request-prompt-category">✈ Replied to {match[1]}</span>
                                            <p className="request-prompt-body">"{match[2]}"</p>
                                        </div>
                                    );
                                }
                                return (
                                    <div className="request-teaser">
                                        <span className="teaser-quote">“</span>
                                        <p>{req.message_teaser}</p>
                                    </div>
                                );
                            })()}

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
                </>
            ) : (
                <div className="empty-requests">
                    <div className="empty-icon">💌</div>
                    <h2>No pending requests</h2>
                    <p>When someone swipes right on you, they'll appear here!</p>
                    <button
                        type="button"
                        className="empty-requests-discovery-cta"
                        onClick={() => {
                            triggerLightHaptic();
                            navigate('/match');
                        }}
                    >
                        ⚡ Discover Classmates in Match Feed →
                    </button>
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
