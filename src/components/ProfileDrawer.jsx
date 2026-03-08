import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import { recordSwipe } from '../services/swipeService'; // or whatever handles payment
import { supabase } from '../lib/supabase';
import StatusViewer from './StatusViewer';
import { getUserStatuses } from '../services/statusService';
import './ProfileDrawer.css';

export default function ProfileDrawer({ isOpen, profile, onClose }) {
    const navigate = useNavigate();
    const { currentUser, walletBalance } = useAuth();
    const { addToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [userStatuses, setUserStatuses] = useState([]);
    const [showStatusViewer, setShowStatusViewer] = useState(false);

    // Prevent body scroll when drawer is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // Check for active statuses when profile changes
    useEffect(() => {
        if (profile && profile.id) {
            const fetchStatuses = async () => {
                const { data } = await getUserStatuses(profile.id);
                setUserStatuses(data || []);
            };
            fetchStatuses();
        }
    }, [profile]);

    if (!profile) return null;

    const handleVibe = async () => {
        // 1. Check wallet balance
        if (walletBalance < 500) {
            addToast('Insufficient funds. Please top up your wallet.', 'error');
            setTimeout(() => navigate('/wallet'), 1500);
            return;
        }

        setLoading(true);
        try {
            // 2. Process payment/swipe request
            // Treating this as a "premium" request that deducts 500 NGN
            const result = await recordSwipe(currentUser.id, profile.id, 'right', 'premium', 'Started a vibe from Explore');

            if (result.error) {
                addToast(result.error, 'error');
            } else {
                addToast(`Vibe started with ${profile.full_name}! 500 NGN deducted.`, 'success');
                onClose(); // Close drawer on success

                // Fetch the auto-created match string
                const { data: matchData } = await supabase
                    .from('matches')
                    .select('id')
                    .contains('user_ids', [currentUser.id, profile.id])
                    .single();

                if (matchData) {
                    navigate(`/chat/${matchData.id}`);
                }
            }
        } catch (err) {
            addToast('Failed to start vibe. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="drawer-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    {/* Drawer Content */}
                    <motion.div
                        className="profile-drawer"
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        drag="y"
                        dragConstraints={{ top: 0 }}
                        dragElastic={0.2}
                        onDragEnd={(e, { offset, velocity }) => {
                            if (offset.y > 150 || velocity.y > 500) {
                                onClose();
                            }
                        }}
                    >
                        <div className="drawer-handle" />

                        <div className="drawer-scroll-content">
                            {/* Photo Carousel */}
                            <div className="drawer-photos">
                                {profile.profile_photos?.length > 0 ? (
                                    profile.profile_photos.map((photo, idx) => (
                                        <div
                                            key={idx}
                                            className={`drawer-photo-wrapper ${userStatuses.length > 0 ? 'has-status' : ''}`}
                                            onClick={() => userStatuses.length > 0 && setShowStatusViewer(true)}
                                            style={{ cursor: userStatuses.length > 0 ? 'pointer' : 'default' }}
                                        >
                                            <img src={photo} alt={`${profile.full_name} ${idx + 1}`} />
                                        </div>
                                    ))
                                ) : (
                                    <div
                                        className={`drawer-photo-wrapper ${userStatuses.length > 0 ? 'has-status' : ''}`}
                                        onClick={() => userStatuses.length > 0 && setShowStatusViewer(true)}
                                        style={{ cursor: userStatuses.length > 0 ? 'pointer' : 'default' }}
                                    >
                                        <img src={profile.avatar_url || '/placeholder-avatar.png'} alt={profile.full_name} />
                                    </div>
                                )}
                            </div>

                            <div className="drawer-details">
                                <div className="drawer-header">
                                    <h2 className="drawer-name">
                                        {profile.full_name}, <span className="drawer-age">{profile.age}</span>
                                    </h2>
                                    {profile.is_live && <span className="live-badge">LIVE</span>}
                                </div>

                                <p className="drawer-university">
                                    🎓 {profile.level} - {profile.faculty} <br />
                                    {profile.university}
                                </p>

                                {profile.attraction_goal && (
                                    <div className="drawer-intent-box">
                                        <span className="intent-icon">
                                            {profile.attraction_goal === 'Casual' ? '🔥' :
                                                profile.attraction_goal === 'Serious' ? '💍' : '🤝'}
                                        </span>
                                        <div>
                                            <strong>Looking for</strong>
                                            <p>{profile.attraction_goal}</p>
                                        </div>
                                    </div>
                                )}

                                {profile.bio && (
                                    <div className="drawer-bio">
                                        <h3>About me</h3>
                                        <p>{profile.bio}</p>
                                    </div>
                                )}

                                {/* Vibe Tags */}
                                {profile.interests?.length > 0 && (
                                    <div className="drawer-vibes">
                                        <h3>The Vibe</h3>
                                        <div className="vibe-tags">
                                            {profile.interests.map((tag, idx) => (
                                                <span key={idx} className="vibe-tag">{tag}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Sticky Action Footer */}
                        <div className="drawer-footer">
                            <button
                                className="btn-vibe-pay"
                                onClick={handleVibe}
                                disabled={loading}
                            >
                                {loading ? 'Processing...' : 'Pay ₦500 to Start Vibe ✨'}
                            </button>
                            <p className="wallet-balance-note">
                                Wallet Balance: ₦{walletBalance?.toLocaleString() || 0}
                            </p>
                        </div>
                    </motion.div>

                    {/* Status Viewer Overlay */}
                    <AnimatePresence>
                        {showStatusViewer && userStatuses.length > 0 && (
                            <StatusViewer
                                statuses={userStatuses}
                                profile={profile}
                                onClose={() => setShowStatusViewer(false)}
                            />
                        )}
                    </AnimatePresence>
                </>
            )}
        </AnimatePresence>
    );
}
