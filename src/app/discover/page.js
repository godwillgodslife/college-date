'use client';

import Image from 'next/image';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import StatusInput from '@/components/StatusInput';
import StoriesFeed from '@/components/StoriesFeed';
import snapshotUpload from '@/components/SnapshotUpload';
import BottomNav from '@/components/BottomNav';

export default function DiscoverPage() {
    const router = useRouter();
    const supabase = createClient();
    const { user, profile, refreshProfile, loading: authLoading } = useAuth();

    // UI state
    const [profiles, setProfiles] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(false); // Data loading (not auth)

    // ... (rest of state items: showPayment, pendingSwipe, etc.)
    const [showPayment, setShowPayment] = useState(false);
    const [pendingSwipe, setPendingSwipe] = useState(null);
    const [swipeDirection, setSwipeDirection] = useState(null);
    const [cardPosition, setCardPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [showProfileDetail, setShowProfileDetail] = useState(false);
    const [toast, setToast] = useState(null);
    const dragStart = useRef({ x: 0, y: 0 });
    const cardRef = useRef(null);

    const loadData = useCallback(async () => {
        if (!user || !profile) return;
        setLoading(true);

        try {
            // Get already swiped profiles
            const { data: swipedData } = await supabase
                .from('swipes')
                .select('swiped_id')
                .eq('swiper_id', user.id);

            const swipedIds = (swipedData || []).map((s) => s.swiped_id);

            // Fetch opposite gender profiles
            const targetGender = profile.gender === 'male' ? 'female' : 'male';
            let query = supabase
                .from('profiles')
                .select('*')
                .eq('gender', targetGender)
                .eq('is_blocked', false)
                .neq('id', user.id);

            if (swipedIds.length > 0) {
                query = query.not('id', 'in', `(${swipedIds.join(',')})`);
            }

            const { data: profilesData } = await query.limit(50);
            setProfiles(profilesData || []);
        } catch (err) {
            console.error('Error loading data:', err);
        } finally {
            setLoading(false);
        }
    }, [user, profile, supabase]); // dependencies

    useEffect(() => {
        if (!authLoading && user && profile) {
            loadData();
        }
    }, [authLoading, user, profile, loadData]);

    // Show loading while auth checks are happening or data is loading
    if (authLoading || (loading && profiles.length === 0)) {
        return (
            <div style={{
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)'
            }}>
                <div className="spinner"></div>
            </div>
        );
    }

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleSwipe = useCallback(async (direction) => {
        if (!profiles[currentIndex]) return;

        const targetProfile = profiles[currentIndex];

        // Optimistic UI: Immediately advance the card
        // We do this BEFORE the async DB call
        const previousIndex = currentIndex;
        setCurrentIndex((prev) => prev + 1);
        setCardPosition({ x: 0, y: 0 });
        setSwipeDirection(null);
        setIsDragging(false);

        // Background / Async Logic
        try {
            if (direction === 'left') {
                // Record pass swipe
                await supabase.from('swipes').insert({
                    swiper_id: user.id,
                    swiped_id: targetProfile.id,
                    direction: 'left',
                    is_free: true,
                    is_paid: false,
                });
            } else {
                // Right swipe — like
                // Logic for free/paid swipes
                const isFemale = profile?.gender === 'female';
                const hasFreeSwipes = (profile?.free_swipes_remaining || 0) > 0;

                if (isFemale || hasFreeSwipes) {
                    // Optimistic Toast
                    showToast(isFemale ? `Liked ${targetProfile.full_name}! 💕` : `Matched with ${targetProfile.full_name}! 🎉`);

                    await supabase.from('swipes').insert({
                        swiper_id: user.id,
                        swiped_id: targetProfile.id,
                        direction: 'right',
                        is_free: true,
                        is_paid: false,
                    });

                    if (!isFemale) {
                        // Decrease free swipes (Local State update)
                        const newFreeSwipes = (profile?.free_swipes_remaining || 1) - 1;
                        // Since we are using global profile, we should ideally update it via context or just wait for DB 
                        // For immediate feedback, we'll call refreshProfile after DB update or if we had a local setter.
                        // For now, let's just do the DB update and then refresh.

                        // DB Update (Background)
                        await supabase
                            .from('profiles')
                            .update({ free_swipes_remaining: newFreeSwipes })
                            .eq('id', user.id);

                        refreshProfile(); // Sync global state
                    }

                    // Create conversation (Background)
                    createConversation(user.id, targetProfile.id).catch(err =>
                        console.error('Error creating convo:', err)
                    );
                } else {
                    // Payment required - Revert optimistic update because we need to show modal
                    setCurrentIndex(previousIndex);
                    setPendingSwipe(targetProfile);
                    setShowPayment(true);
                }
            }
        } catch (error) {
            console.error('Swipe error:', error);
            // Optional: Revert on error or show toast "Swipe failed"
            // For now, simpler to just log it as reverting shakes the UI too much
        }
    }, [profiles, currentIndex, user, profile, supabase, refreshProfile]);

    const createConversation = async (userId1, userId2) => {
        const p1 = userId1 < userId2 ? userId1 : userId2;
        const p2 = userId1 < userId2 ? userId2 : userId1;

        const { data: existing } = await supabase
            .from('conversations')
            .select('id')
            .eq('participant_1', p1)
            .eq('participant_2', p2)
            .single();

        if (!existing) {
            await supabase.from('conversations').insert({
                participant_1: p1,
                participant_2: p2,
            });
        }
    };

    const handlePaymentComplete = async (txRef) => {
        if (!pendingSwipe) return;

        try {
            // Verify payment server-side
            const res = await fetch('/api/payment/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transaction_ref: txRef }),
            });

            const result = await res.json();

            if (result.success) {
                // Record paid swipe
                await supabase.from('swipes').insert({
                    swiper_id: user.id,
                    swiped_id: pendingSwipe.id,
                    direction: 'right',
                    is_free: false,
                    is_paid: true,
                    transaction_id: result.transaction_id,
                });

                await createConversation(user.id, pendingSwipe.id);
                showToast(`Matched with ${pendingSwipe.full_name}! 💕`);
                setCurrentIndex((prev) => prev + 1);
            } else {
                showToast('Payment verification failed', 'error');
            }
        } catch (err) {
            showToast('Payment error: ' + err.message, 'error');
        } finally {
            setShowPayment(false);
            setPendingSwipe(null);
            setCardPosition({ x: 0, y: 0 });
        }
    };

    const initiateFlutterwavePayment = () => {
        if (typeof window === 'undefined' || !pendingSwipe) return;

        // Use Flutterwave inline JS
        const modal = window.FlutterwaveCheckout?.({
            public_key: process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY,
            tx_ref: `CD_${user.id}_${pendingSwipe.id}_${Date.now()}`,
            amount: 500,
            currency: 'NGN',
            payment_options: 'card,banktransfer,ussd',
            customer: {
                email: user.email,
                name: profile?.full_name,
            },
            customizations: {
                title: 'College Date',
                description: `Swipe on ${pendingSwipe.full_name}`,
                logo: '',
            },
            callback: (response) => {
                if (response.status === 'successful') {
                    handlePaymentComplete(response.tx_ref);
                }
                modal?.close();
            },
            onclose: () => {
                setShowPayment(false);
                setPendingSwipe(null);
            },
        });
    };

    // Touch/mouse drag handlers
    const handleDragStart = (e) => {
        setIsDragging(true);
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        dragStart.current = { x: clientX, y: clientY };
    };

    const handleDragMove = (e) => {
        if (!isDragging) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const x = clientX - dragStart.current.x;
        const y = clientY - dragStart.current.y;
        setCardPosition({ x, y });

        if (x > 60) setSwipeDirection('right');
        else if (x < -60) setSwipeDirection('left');
        else setSwipeDirection(null);
    };

    const handleDragEnd = () => {
        setIsDragging(false);
        if (cardPosition.x > 100) {
            handleSwipe('right');
        } else if (cardPosition.x < -100) {
            handleSwipe('left');
        } else {
            setCardPosition({ x: 0, y: 0 });
        }
        setSwipeDirection(null);
    };

    const currentProfile = profiles[currentIndex];

    const [showUpload, setShowUpload] = useState(false);

    // ... (existing loading check)

    return (
        <div className="page">
            <div className="container">
                <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h1 className="page-title">Discover</h1>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {profile?.gender === 'male' && (
                            <div style={{ marginTop: 12 }}>
                                ⚡ {profile?.free_swipes_remaining} free swipes remaining
                            </div>
                        )}
                        <button
                            onClick={() => setShowUpload(!showUpload)}
                            style={{
                                background: 'transparent',
                                border: '1px solid var(--primary)',
                                color: 'var(--primary)',
                                borderRadius: '50%',
                                width: '32px',
                                height: '32px',
                                cursor: 'pointer',
                                fontSize: '1.2rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            +
                        </button>
                    </div>
                </div>

                {/* 2.2 Features disabled for stabilization */}
                {/* <StatusInput /> */}
                {/* <StoriesFeed /> */}

                {showUpload && (
                    <div style={{ marginBottom: '16px', animation: 'fade-in-up 0.3s ease' }}>
                        {/* <SnapshotUpload onUploadComplete={() => setShowUpload(false)} /> */}
                        <div style={{ padding: '20px', textAlign: 'center', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)' }}>
                            Snapshots are temporarily disabled for maintenance.
                        </div>
                    </div>
                )}

                {!currentProfile ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">😅</div>
                        <h3 className="empty-state-title">No more profiles</h3>
                        <p className="empty-state-desc">
                            Check back later for new people on campus!
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="swipe-container">
                            {/* Next card preview */}
                            {profiles[currentIndex + 1] && (
                                <div
                                    className="swipe-card"
                                    style={{
                                        transform: 'scale(0.95)',
                                        zIndex: 0,
                                        filter: 'brightness(0.7)',
                                    }}
                                >
                                    <Image
                                        src={profiles[currentIndex + 1].photos?.[0] || profiles[currentIndex + 1].avatar_url || '/placeholder-avatar.png'}
                                        alt=""
                                        className="swipe-card-image"
                                        fill
                                        sizes="(max-width: 768px) 100vw, 400px"
                                        style={{
                                            objectFit: 'cover',
                                        }}
                                    />
                                </div>
                            )}

                            {/* Current card */}
                            <div
                                ref={cardRef}
                                className="swipe-card"
                                style={{
                                    transform: `translateX(${cardPosition.x}px) translateY(${cardPosition.y * 0.3}px) rotate(${cardPosition.x * 0.08}deg)`,
                                    zIndex: 1,
                                    transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                }}
                                onMouseDown={handleDragStart}
                                onMouseMove={handleDragMove}
                                onMouseUp={handleDragEnd}
                                onMouseLeave={() => isDragging && handleDragEnd()}
                                onTouchStart={handleDragStart}
                                onTouchMove={handleDragMove}
                                onTouchEnd={handleDragEnd}
                            >
                                <Image
                                    src={currentProfile.photos?.[0] || currentProfile.avatar_url || '/placeholder-avatar.png'}
                                    alt={currentProfile.full_name}
                                    className="swipe-card-image"
                                    fill
                                    sizes="(max-width: 768px) 100vw, 400px"
                                    priority
                                    style={{
                                        objectFit: 'cover',
                                        pointerEvents: 'none'
                                    }}
                                    draggable={false}
                                />

                                {/* LIKE stamp */}
                                <div
                                    className="swipe-stamp swipe-stamp-like"
                                    style={{ opacity: swipeDirection === 'right' ? 1 : 0 }}
                                >
                                    LIKE
                                </div>

                                {/* NOPE stamp */}
                                <div
                                    className="swipe-stamp swipe-stamp-nope"
                                    style={{ opacity: swipeDirection === 'left' ? 1 : 0 }}
                                >
                                    NOPE
                                </div>

                                <div className="swipe-card-overlay" onClick={() => setShowProfileDetail(true)}>
                                    <div className="swipe-card-name">
                                        {currentProfile.full_name}
                                        <span>{currentProfile.age}</span>
                                    </div>
                                    <div className="swipe-card-uni">
                                        🎓 {currentProfile.university}
                                    </div>
                                    {currentProfile.bio && (
                                        <div className="swipe-card-bio">{currentProfile.bio}</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="swipe-actions">
                            <button
                                className="swipe-btn swipe-btn-pass"
                                onClick={() => handleSwipe('left')}
                            >
                                ✕
                            </button>
                            <button
                                className="swipe-btn swipe-btn-like"
                                onClick={() => handleSwipe('right')}
                            >
                                ♥
                            </button>
                            <button
                                className="swipe-btn swipe-btn-info"
                                onClick={() => setShowProfileDetail(true)}
                            >
                                ℹ
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Payment Modal */}
            {
                showPayment && pendingSwipe && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                                <Image
                                    src={pendingSwipe.avatar_url || '/placeholder-avatar.png'}
                                    alt={pendingSwipe.full_name}
                                    className="img-enhanced" // Added class for "sexy" filter
                                    width={80}
                                    height={80}
                                    style={{
                                        borderRadius: '50%',
                                        objectFit: 'cover',
                                        margin: '0 auto 12px',
                                        border: '3px solid var(--primary)',
                                    }}
                                />
                            </div>
                            <h3 className="modal-title" style={{ textAlign: 'center' }}>
                                Swipe on {pendingSwipe.full_name}?
                            </h3>
                            <p className="modal-desc" style={{ textAlign: 'center' }}>
                                Your free swipes are used up! Pay to unlock chat & contact.
                            </p>
                            <div className="modal-price">₦500</div>
                            <p style={{
                                textAlign: 'center',
                                fontSize: '0.8rem',
                                color: 'var(--text-muted)',
                                marginBottom: '8px',
                            }}>
                                ₦250 goes to {pendingSwipe.full_name} • ₦250 platform fee
                            </p>
                            <div className="modal-actions" style={{ flexDirection: 'column' }}>
                                <button
                                    className="btn btn-primary btn-full btn-lg"
                                    onClick={initiateFlutterwavePayment}
                                >
                                    💳 Pay ₦500
                                </button>
                                <button
                                    className="btn btn-secondary btn-full"
                                    onClick={() => {
                                        setShowPayment(false);
                                        setPendingSwipe(null);
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Profile Detail Modal */}
            {
                showProfileDetail && currentProfile && (
                    <div className="modal-overlay" onClick={() => setShowProfileDetail(false)}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '80vh', overflow: 'auto' }}>
                            <div className="profile-header">
                                <img
                                    src={currentProfile.avatar_url || '/placeholder-avatar.png'}
                                    alt={currentProfile.full_name}
                                    className="profile-avatar-large"
                                />
                                <h2 className="profile-name">{currentProfile.full_name}, {currentProfile.age}</h2>
                                <p className="profile-uni">🎓 {currentProfile.university}</p>
                                {currentProfile.bio && <p className="profile-bio">{currentProfile.bio}</p>}
                            </div>
                            {currentProfile.photos && currentProfile.photos.length > 0 && (
                                <div className="profile-photos">
                                    {currentProfile.photos.map((url, i) => (
                                        <img key={i} src={url} alt="" className="profile-photo" />
                                    ))}
                                </div>
                            )}
                            <button
                                className="btn btn-primary btn-full"
                                style={{ marginTop: 20 }}
                                onClick={() => setShowProfileDetail(false)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )
            }

            {/* Toast */}
            {
                toast && (
                    <div className={`toast toast-${toast.type}`}>
                        <span className="toast-message">{toast.message}</span>
                    </div>
                )
            }

            <BottomNav gender={profile?.gender} />

            {/* Flutterwave inline script */}
            <script src="https://checkout.flutterwave.com/v3.js" async />
        </div >
    );
}
