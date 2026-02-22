import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { acceptRequest, declineRequest } from '../services/swipeService';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import AndroidInstallButton from '../components/AndroidInstallButton';
import './Requests.css';


export default function Requests() {
    const { currentUser, userProfile } = useAuth();
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actioning, setActioning] = useState(null); // ID of request being processed

    async function fetchRequests() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('swipes')
                .select(`
                    *,
                    swiper:profiles!swipes_swiper_id_fkey(*)
                `)
                .eq('swiped_id', currentUser.id)
                .eq('status', 'pending')
                .order('is_priority', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) throw error;
            setRequests(data || []);
        } catch (err) {
            console.error('Error fetching requests:', err);
            addToast('Failed to load requests', 'error');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (!currentUser) return;

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
    }, [currentUser]);

    const handleAccept = async (swipeId) => {
        setActioning(swipeId);
        try {
            const { data, error } = await acceptRequest(swipeId);
            if (error) throw error;
            if (data && !data.success) throw new Error(data.error || 'Failed to accept');

            addToast('Request accepted! Chat unlocked.', 'success');
            setRequests(prev => prev.filter(r => r.id !== swipeId));
            setTimeout(() => navigate('/chat'), 1500);
        } catch (err) {
            addToast(err.message, 'error');
        } finally {
            setActioning(null);
        }
    };

    const handleDecline = async (swipeId) => {
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

            {requests.length > 0 ? (
                <div className="requests-grid">
                    {requests.map(req => (
                        <div key={req.id} className={`request-card ${req.is_priority ? 'priority' : ''}`}>
                            {req.is_priority && (
                                <div className="priority-badge">💎 PREMIUM</div>
                            )}
                            <div className="request-user">
                                <div className="user-avatar-small">
                                    {req.swiper.avatar_url ? (
                                        <img src={req.swiper.avatar_url} alt={req.swiper.full_name} />
                                    ) : (
                                        <div className="avatar-placeholder">{req.swiper.full_name?.charAt(0)}</div>
                                    )}
                                </div>
                                <div className="user-details">
                                    <h3>{req.swiper.full_name}</h3>
                                    <p>{req.swiper.university}</p>
                                </div>
                            </div>

                            {req.message_teaser && (
                                <div className="request-teaser">
                                    <span className="teaser-quote">“</span>
                                    <p>{req.message_teaser}</p>
                                </div>
                            )}

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
