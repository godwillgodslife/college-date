import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    PAYSTACK_PRODUCTS,
    getSubscription,
    getWallet,
    payWithWallet,
    purchaseBoost,
    getActiveBoosts,
    getRevenueCatPackages,
    purchaseRevenueCatPackage,
    startPaystackPayment,
    openHostedPaystackCheckout,
    restoreRevenueCatPurchases,
    verifyAndRestorePremium
} from '../services/paymentService';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import { motion, AnimatePresence } from 'framer-motion';
import { hasActivePremium, isEliteUltra } from '../utils/premium';
import { getUltraAllowance, consumeUltraBoost } from '../services/ultraAllowanceService';
import { ContextualTip, AppGuideModal, markFeatureUsed } from '../components/ContextualGuide';
import ContextualPaywallSheet from '../components/ContextualPaywallSheet';
import { recordPremiumPageVisit } from '../services/trialService';
import confetti from 'canvas-confetti';
import './PremiumUpgrade.css';

const isNative = () => {
    return typeof window !== 'undefined' &&
        window.Capacitor !== undefined &&
        window.Capacitor.isNativePlatform();
};

const SUBSCRIPTION_TIERS = [
    {
        id: 'premium_monthly',
        productId: PAYSTACK_PRODUCTS.premiumMonthly,
        name: '1 Month',
        durationShort: '1 Mo',
        price: 2900,
        rateLabel: '₦2,900',
        perPeriod: '/ mo',
        totalLabel: '₦2,900 billed monthly',
        durationDays: 30,
        tag: null,
        savings: 0,
        dailyRate: '₦97/day'
    },
    {
        id: 'premium_3month',
        productId: PAYSTACK_PRODUCTS.premium3Month,
        name: '3 Months',
        durationShort: '3 Mo',
        price: 7200,
        rateLabel: '₦2,400',
        perPeriod: '/ mo',
        totalLabel: '₦7,200 billed quarterly',
        durationDays: 90,
        tag: 'Save ₦1,500',
        savings: 1500,
        isPopular: true,
        dailyRate: '₦80/day'
    },
    {
        id: 'premium_annual',
        productId: PAYSTACK_PRODUCTS.premiumAnnual,
        name: '12 Months',
        durationShort: '12 Mo',
        price: 21600,
        rateLabel: '₦1,800',
        perPeriod: '/ mo',
        totalLabel: '₦21,600 billed yearly',
        durationDays: 365,
        tag: 'Best Value',
        savings: 13200,
        isBestValue: true,
        dailyRate: '₦59/day'
    }
];

const ULTRA_SUBSCRIPTION_TIERS = [
    {
        id: 'ultra_monthly',
        productId: PAYSTACK_PRODUCTS.ultraMonthly,
        name: '1 Month',
        durationShort: '1 Mo',
        price: 15000,
        rateLabel: '₦15,000',
        perPeriod: '/ mo',
        totalLabel: '₦15,000 billed monthly',
        durationDays: 30,
        tag: null,
        savings: 0,
        dailyRate: '₦500/day'
    },
    {
        id: 'ultra_2month',
        productId: PAYSTACK_PRODUCTS.ultra2Month,
        name: '2 Months',
        durationShort: '2 Mo',
        price: 30000,
        rateLabel: '₦15,000',
        perPeriod: '/ mo',
        totalLabel: '₦30,000 for 2 months',
        durationDays: 60,
        tag: null,
        savings: 0,
        dailyRate: '₦500/day'
    },
    {
        id: 'ultra_3month',
        productId: PAYSTACK_PRODUCTS.ultra3Month,
        name: '3 Months',
        durationShort: '3 Mo',
        price: 35000,
        rateLabel: '₦11,667',
        perPeriod: '/ mo',
        totalLabel: '₦35,000 for 3 months',
        durationDays: 90,
        tag: 'Save ₦10,000',
        savings: 10000,
        isPopular: true,
        isBestValue: true,
        dailyRate: '₦389/day'
    }
];

const PREVIEW_TABS = [
    {
        id: 'admirers',
        label: '👀 Secret Admirers',
        title: 'See Who Checked You Out',
        badge: 'Instant Mutual Match',
        description: 'Skip the guessing game. See the exact list of students who liked you and match with them in 1 tap without waiting.'
    },
    {
        id: 'spotlight',
        label: '🚀 Priority Spotlight',
        title: 'Top 10% Campus Feed Placement',
        badge: '10x Higher Visibility',
        description: 'Be seen first by the most active, attractive students across your university and department before anyone else.'
    },
    {
        id: 'video',
        label: '🎬 Live Video Profile',
        title: 'Authentic Voice & Vibe',
        badge: '3x More Matches',
        description: 'Introduce yourself with a real 10-second video moment on standard Premium (or an extended 30-second HD video on Elite Ultra). Proven to build immediate chemistry.'
    },
    {
        id: 'finder',
        label: '🔍 Campus Finder',
        title: 'Optical Campus Discovery',
        badge: 'Unlimited in Elite',
        description: 'Met someone around your lecture hall, library, or faculty? Take a quick photo to verify if they are on College Date with zero weekly caps.'
    }
];

const OUTCOME_HIGHLIGHTS = [
    {
        icon: '✨',
        title: 'Unlimited Swipes',
        outcome: 'No 20-swipe walls between lectures'
    },
    {
        icon: '🔍',
        title: 'Unlimited Campus Finder',
        outcome: 'Scan & verify students you meet on campus with zero weekly limits'
    },
    {
        icon: '👀',
        title: 'Unblurred Views',
        outcome: 'See every student who checks your profile'
    },
    {
        icon: '⚡',
        title: 'Free Weekly Boost',
        outcome: '₦4,000 monthly value credited automatically'
    },
    {
        icon: '📞',
        title: 'Unlimited HD Calls',
        outcome: 'Deep late-night voice & video without limits'
    },
    {
        icon: '👑',
        title: 'Verified Crown Badge',
        outcome: 'Command attention & +3x match response rate'
    },
    {
        icon: '🕵️',
        title: 'Incognito Ghost Mode',
        outcome: 'Browse campus crushes with complete privacy'
    }
];

const FAQS = [
    {
        question: 'Will my card be charged automatically?',
        answer: 'Card subscriptions renew at the end of each billing cycle so your benefits never lapse. You can easily turn off auto-renewal anytime in Settings or your Google Play account with 1 tap. Campus wallet payments never renew automatically.'
    },
    {
        question: 'Can I cancel anytime?',
        answer: 'Yes, absolutely! You can cancel at any time with zero hassle from your Account Settings or Google Play Subscriptions. Your premium perks stay active until the end of your prepaid period.'
    },
    {
        question: 'What if I pay but Premium doesn\'t activate immediately?',
        answer: 'All payments are linked directly to your student account. If a network delay occurs, simply tap "Restore" at the top right of this screen, or tap "Chat with us" below for instant WhatsApp support.'
    },
    {
        question: 'Can I pay with bank transfer, USSD, or wallet balance?',
        answer: 'Yes! Paystack securely supports all Nigerian debit cards (Mastercard, Visa, Verve), direct bank transfer, USSD (*737#, *919#, etc.), and your College Date wallet balance.'
    }
];

export default function PremiumUpgrade() {
    const navigate = useNavigate();
    const { currentUser, userProfile, fetchProfile } = useAuth();
    const { addToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [guideModalOpen, setGuideModalOpen] = useState(false);
    const [subscription, setSubscription] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [wallet, setWallet] = useState(null);
    const [boostData, setBoostData] = useState({ hasBoosted: false, activeBoost: null, superSwipeCount: 0 });
    const [processingBoost, setProcessingBoost] = useState(null);
    const [rcPackages, setRcPackages] = useState([]);
    const [tierCategory, setTierCategory] = useState(() => {
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('tier') === 'ultra') return 'ultra';
        }
        return 'premium';
    });
    const [selectedTierId, setSelectedTierId] = useState(() => {
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            const sel = urlParams.get('selected');
            if (sel) return sel;
            if (urlParams.get('tier') === 'ultra') return 'ultra_3month';
        }
        return 'premium_3month';
    });
    const [activeTab, setActiveTab] = useState('admirers');
    const [openFaqIndex, setOpenFaqIndex] = useState(null);
    const [showManagePlans, setShowManagePlans] = useState(false);
    const [showFeaturePreviews, setShowFeaturePreviews] = useState(false);
    const [paywallOpen, setPaywallOpen] = useState(false);
    const [paywallTrigger, setPaywallTrigger] = useState('repeated_premium_visits');

    const isUltraUser = isEliteUltra(userProfile) || isEliteUltra(subscription);
    const isPremium = hasActivePremium(userProfile) || hasActivePremium(subscription);
    const [ultraAllowance, setUltraAllowance] = useState(() => getUltraAllowance(currentUser?.id, subscription));

    const activeTiers = tierCategory === 'ultra' ? ULTRA_SUBSCRIPTION_TIERS : SUBSCRIPTION_TIERS;
    const currentTier = activeTiers.find(t => t.id === selectedTierId) || activeTiers[1] || activeTiers[0];

    useEffect(() => {
        if (currentUser?.id) {
            setUltraAllowance(getUltraAllowance(currentUser.id, subscription));
            if (isUltraUser && tierCategory === 'premium') {
                setTierCategory('ultra');
            }
        }
    }, [currentUser?.id, subscription, isUltraUser]);

    useEffect(() => {
        const handleAllowanceUpdate = () => {
            if (currentUser?.id) {
                setUltraAllowance(getUltraAllowance(currentUser.id, subscription));
            }
        };
        window.addEventListener('cd:allowance-updated', handleAllowanceUpdate);
        return () => window.removeEventListener('cd:allowance-updated', handleAllowanceUpdate);
    }, [currentUser?.id, subscription]);

    useEffect(() => {
        if (!currentUser) {
            setLoading(false);
            return;
        }

        async function initPageData() {
            setLoading(true);
            try {
                const promises = [
                    loadSubscription(false),
                    loadWallet(),
                    loadBoosts()
                ];
                if (isNative()) {
                    promises.push(loadRevenueCatOfferings());
                }
                await Promise.all(promises);
            } catch (err) {
                console.error('Error loading premium page metadata:', err);
            } finally {
                setLoading(false);
            }
        }

        initPageData();

        // Celebration confetti trigger if arriving via post-purchase redirect
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('welcome') === 'true') {
            try {
                confetti({
                    particleCount: 80,
                    spread: 70,
                    origin: { y: 0.6 }
                });
            } catch {
                // Ignore confetti environment errors
            }
        }

        if (!isPremium && currentUser) {
            const shouldNudge = recordPremiumPageVisit();
            if (shouldNudge) {
                const timer = setTimeout(() => {
                    setPaywallOpen(true);
                }, 1500);
                return () => clearTimeout(timer);
            }
        }
    }, [currentUser, isPremium]);

    async function loadRevenueCatOfferings() {
        try {
            const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve([]), 3000));
            const pkgs = await Promise.race([getRevenueCatPackages(), timeoutPromise]);
            if (pkgs && pkgs.length > 0) {
                setRcPackages(pkgs);
            }
        } catch (err) {
            console.warn('[RevenueCat] Package load timed out or failed:', err);
        }
    }

    async function loadWallet() {
        try {
            const { data } = await getWallet(currentUser.id);
            setWallet(data);
        } catch (err) {
            console.error('Error loading wallet:', err);
        }
    }

    async function loadBoosts() {
        try {
            const { data } = await getActiveBoosts(currentUser.id);
            setBoostData(data);
        } catch (err) {
            console.error('Error loading boosts:', err);
        }
    }

    async function loadSubscription(shouldSetLoadingState = true) {
        if (shouldSetLoadingState) setLoading(true);
        try {
            const { data, error } = await getSubscription(currentUser.id);
            if (error && error.code !== 'PGRST116') throw error;
            setSubscription(data);
        } catch (err) {
            console.error('Error loading subscription:', err);
        } finally {
            if (shouldSetLoadingState) setLoading(false);
        }
    }

    const handleSubscribe = async () => {
        if (isNative()) {
            await handleNativeSubscribe(currentTier);
        } else {
            await handleWebSubscribe(currentTier);
        }
    };

    const handleActivateUltraBoost = async () => {
        if (!currentUser?.id) return;
        setIsProcessing(true);
        try {
            const res = await consumeUltraBoost(currentUser.id, subscription);
            if (res.success) {
                addToast('24h Visibility Boost activated! 🚀 Jumped to top of campus feed.', 'success');
                try {
                    confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
                } catch {
                    // Confetti fallback
                }
                await loadBoosts();
                setUltraAllowance(getUltraAllowance(currentUser.id, subscription));
            } else if (res.reason === 'boost_already_active') {
                addToast('You already have an active 24h boost running!', 'info');
            } else if (res.reason === 'allowance_exhausted') {
                addToast('You have used all 10 visibility boosts for this cycle.', 'warning');
            } else {
                addToast('Could not activate boost. Please try again.', 'error');
            }
        } catch (err) {
            console.error('Error activating Ultra boost:', err);
            addToast('Error activating boost.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleNativeSubscribe = async (tier = currentTier) => {
        if (rcPackages.length === 0) {
            console.warn('[PremiumUpgrade] No RevenueCat packages found, falling back to secure card checkout');
            await handleWebSubscribe(tier);
            return;
        }

        setIsProcessing(true);
        try {
            const pkgToBuy = rcPackages.find((pkg) => {
                const id = (pkg.identifier || '').toLowerCase();
                const prodId = (pkg.product?.identifier || '').toLowerCase();
                if (tier.id === 'premium_monthly') {
                    return id === '$rc_monthly' || id.includes('monthly') || prodId.includes('monthly');
                }
                if (tier.id === 'premium_3month') {
                    return id === '$rc_three_month' || id.includes('3month') || id.includes('quarterly') || prodId.includes('3month');
                }
                if (tier.id === 'premium_annual') {
                    return id === '$rc_annual' || id.includes('annual') || id.includes('yearly') || prodId.includes('annual');
                }
                if (tier.id === 'ultra_monthly') {
                    return (id.includes('ultra') && id.includes('monthly')) || prodId.includes('ultra_monthly') || (id.includes('ultra') && !id.includes('2month') && !id.includes('3month'));
                }
                if (tier.id === 'ultra_2month') {
                    return (id.includes('ultra') && id.includes('2month')) || prodId.includes('ultra_2month');
                }
                if (tier.id === 'ultra_3month') {
                    return (id.includes('ultra') && (id.includes('3month') || id.includes('quarterly'))) || prodId.includes('ultra_3month');
                }
                return false;
            });

            if (!pkgToBuy) {
                console.warn('[PremiumUpgrade] No matching RevenueCat package found for tier, falling back to secure card checkout');
                if (tierCategory === 'ultra') {
                    addToast('Routing to secure payment gateway for Elite Ultra...', 'info');
                }
                await handleWebSubscribe(tier);
                return;
            }

            const { success, error } = await purchaseRevenueCatPackage(pkgToBuy, {
                requiredEntitlement: tierCategory === 'ultra' ? 'Ultra' : 'Premium',
                fallbackEntitlement: 'Premium'
            });

            if (success) {
                const welcomeMsg = tierCategory === 'ultra'
                    ? 'Welcome to College Date Elite Ultra! 👑⭐ All VIP privileges unlocked.'
                    : 'Welcome to College Date Elite! Your benefits are unlocked.';
                addToast(welcomeMsg, 'success');
                try {
                    confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
                } catch {
                    // Confetti fallback
                }
                await loadSubscription();
                await fetchProfile(currentUser.id);
            } else {
                console.warn('[PremiumUpgrade] Native purchase fallback:', error);
                addToast('Redirecting to secure card checkout...', 'info');
                await handleWebSubscribe(tier);
            }
        } catch (err) {
            console.warn('[PremiumUpgrade] Native purchase exception, falling back to Paystack:', err);
            if (!err.userCancelled) {
                addToast('Opening secure card checkout...', 'info');
                await handleWebSubscribe(tier);
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const handleWebSubscribe = async (tier = currentTier) => {
        setIsProcessing(true);
        try {
            // startPaystackPayment(PAYSTACK_PRODUCTS.premiumMonthly)
            const { data: payment, error } = await startPaystackPayment(tier.productId || PAYSTACK_PRODUCTS.premiumMonthly);
            if (error) throw new Error(error);
            openHostedPaystackCheckout(payment);
        } catch (err) {
            console.error('Subscription error:', err);
            addToast(err.message, 'error');
            setIsProcessing(false);
        }
    };

    const handlePayWithWallet = async () => {
        const tier = currentTier;
        if (!wallet || wallet.available_balance < tier.price) {
            addToast(`Insufficient wallet balance. Required: ₦${tier.price.toLocaleString()}`, 'error');
            return;
        }

        setIsProcessing(true);
        try {
            const { error } = await payWithWallet(
                currentUser.id,
                tier.price,
                'subscription',
                `College Date ${tierCategory === 'ultra' ? 'Elite Ultra' : 'Premium'} (${tier.name})`,
                tier.productId
            );

            if (error) throw error;

            addToast(`Welcome to ${tierCategory === 'ultra' ? 'Elite Ultra' : 'Elite'}! Paid ₦${tier.price.toLocaleString()} via wallet balance.`, 'success');
            try {
                confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
            } catch {
                // Confetti fallback
            }
            await loadSubscription();
            await fetchProfile(currentUser.id);
            await loadWallet();
        } catch (err) {
            console.error('Wallet payment error:', err);
            addToast(err.message || 'Payment failed', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRestorePurchases = async () => {
        setIsRestoring(true);
        addToast('Verifying existing purchases...', 'info');
        try {
            if (isNative()) {
                const { success } = await restoreRevenueCatPurchases();
                if (success) {
                    addToast('Active subscription restored successfully! 🎉', 'success');
                    await loadSubscription();
                    await fetchProfile(currentUser.id);
                    return;
                }
            }

            // Fallback for Web / Paystack transactions
            const { data } = await verifyAndRestorePremium();
            if (data?.is_premium || data?.success) {
                addToast('Subscription verified and updated! 🎉', 'success');
                await loadSubscription();
                await fetchProfile(currentUser.id);
            } else {
                addToast('No active subscription found to restore.', 'info');
            }
        } catch (err) {
            console.error('Restore purchases error:', err);
            addToast(err.message || 'Could not verify purchases', 'error');
        } finally {
            setIsRestoring(false);
        }
    };

    const handlePurchaseBoost = async (boostType) => {
        const label = boostType === '24h_boost' ? '24h Boost' : 'Super Swipe';
        const cost = boostType === '24h_boost' ? 1000 : 500;
        const productId = boostType === '24h_boost' ? PAYSTACK_PRODUCTS.boost24h : PAYSTACK_PRODUCTS.superSwipe;

        if (boostType === '24h_boost' && boostData.hasBoosted) {
            addToast('You already have an active 24h Boost!', 'warning');
            return;
        }

        setProcessingBoost(boostType);

        try {
            if (wallet && wallet.available_balance >= cost) {
                const { error } = await purchaseBoost(currentUser.id, boostType);
                if (error) {
                    addToast(error, 'error');
                    return;
                }
                addToast(`${label} purchased from wallet balance! 🎉`, 'success');
                loadWallet();
                loadBoosts();
                return;
            }

            addToast(`Opening checkout for ${label}...`, 'info');
            const { data: payment, error: initError } = await startPaystackPayment(productId);
            if (initError || !payment) {
                throw new Error(initError || 'Could not initiate payment.');
            }

            await openHostedPaystackCheckout(payment, {
                onClose: () => {
                    loadWallet();
                    loadBoosts();
                }
            });
        } catch (err) {
            if (!err.userCancelled) {
                console.error(`Error purchasing ${label}:`, err);
                addToast(err.message || 'Purchase failed', 'error');
            }
        } finally {
            setProcessingBoost(null);
        }
    };

    function getBoostTimeRemaining() {
        if (!boostData.activeBoost) return null;
        const expiresAt = new Date(boostData.activeBoost.expires_at);
        const now = new Date();
        const diffMs = expiresAt - now;
        if (diffMs <= 0) return null;
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    }

    const boostTimeRemaining = getBoostTimeRemaining();

    const getDaysRemaining = () => {
        if (!subscription?.current_period_end) return null;
        const end = new Date(subscription.current_period_end);
        const now = new Date();
        const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
        return diff > 0 ? diff : 0;
    };

    const daysRemaining = getDaysRemaining();
    const activePreview = PREVIEW_TABS.find(t => t.id === activeTab) || PREVIEW_TABS[0];

    if (loading) {
        return (
            <div className="premium-page premium-loading-state">
                <LoadingSpinner text="Loading College Date Elite..." />
            </div>
        );
    }

    return (
        <div className="premium-page animate-fade-in">
            {/* ── Top Navigation Bar ── */}
            <div className="premium-top-bar">
                <button
                    type="button"
                    className="top-bar-btn btn-back"
                    onClick={() => navigate(-1)}
                    aria-label="Go back"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                </button>
                <div className="top-bar-title">
                    <span className="brand-crest">👑</span>
                    <span className="brand-name">College Date Elite</span>
                </div>
                <button
                    type="button"
                    className="top-bar-btn btn-restore"
                    onClick={handleRestorePurchases}
                    disabled={isRestoring}
                >
                    {isRestoring ? 'Checking...' : 'Restore'}
                </button>
            </div>

            {/* ── Active Member Celebration Dashboard ── */}
            {isPremium && !showManagePlans && (
                <div className="active-elite-dashboard">
                    <div className="active-crest-glow">
                        <span className="active-crown-emoji">{isUltraUser ? '👑⭐' : '👑'}</span>
                    </div>
                    <h2 className="active-title">{isUltraUser ? 'You Have the Elite Ultra VIP Edge' : 'You Have the Elite Edge'}</h2>
                    <p className="active-subtitle">
                        Your {isUltraUser ? 'Elite Ultra' : 'premium'} membership is active
                        {subscription?.current_period_end ? (
                            <> until <strong>{new Date(subscription.current_period_end).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</strong> {daysRemaining !== null && `(${daysRemaining} days remaining)`}</>
                        ) : '.'}
                    </p>

                    {/* Elite Ultra Included Allowances Tracker (Realtime) */}
                    {isUltraUser && (
                        <div className="ultra-allowance-dashboard-card">
                            <div className="allowance-card-header">
                                <div className="allowance-badge-group">
                                    <span className="allowance-crown-pill">👑⭐ ELITE ULTRA VIP</span>
                                    <span className="allowance-cycle-pill">
                                        {subscription?.current_period_end
                                            ? `Cycle ends ${new Date(subscription.current_period_end).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
                                            : 'Active Billing Cycle'}
                                    </span>
                                </div>
                                <h3 className="allowance-card-title">Included Monthly Allowances</h3>
                                <p className="allowance-card-sub">
                                    Finite allowances for this billing cycle. Usage never depletes your campus wallet or coin balance.
                                </p>
                            </div>

                            <div className="allowance-meters-grid">
                                <div className="allowance-meter-item">
                                    <div className="meter-top-row">
                                        <span className="meter-icon-label">⭐ Super Swipes</span>
                                        <span className="meter-count-badge">
                                            <strong>{ultraAllowance.superSwipes.remaining}</strong> / 30 left
                                        </span>
                                    </div>
                                    <div className="meter-track">
                                        <div
                                            className="meter-bar super-swipe-bar"
                                            style={{ width: `${Math.min(100, Math.max(0, (ultraAllowance.superSwipes.remaining / 30) * 100))}%` }}
                                        />
                                    </div>
                                    <span className="meter-caption">Priority crush notification alert. Refills each billing cycle.</span>
                                </div>

                                <div className="allowance-meter-item">
                                    <div className="meter-top-row">
                                        <span className="meter-icon-label">🚀 24h Visibility Boosts</span>
                                        <span className="meter-count-badge">
                                            <strong>{ultraAllowance.boosts.remaining}</strong> / 10 left
                                        </span>
                                    </div>
                                    <div className="meter-track">
                                        <div
                                            className="meter-bar boost-bar"
                                            style={{ width: `${Math.min(100, Math.max(0, (ultraAllowance.boosts.remaining / 10) * 100))}%` }}
                                        />
                                    </div>
                                    {boostData.hasBoosted && boostTimeRemaining ? (
                                        <div className="ultra-active-boost-status">
                                            <span className="boost-pulse-dot" />
                                            <span>24h Boost Active — {boostTimeRemaining} remaining</span>
                                        </div>
                                    ) : ultraAllowance.boosts.remaining > 0 ? (
                                        <button
                                            type="button"
                                            className="btn-activate-ultra-boost"
                                            onClick={handleActivateUltraBoost}
                                            disabled={isProcessing}
                                        >
                                            🚀 Activate Included 24h Boost Now
                                        </button>
                                    ) : (
                                        <span className="meter-caption exhausted">All 10 boosts consumed for this cycle.</span>
                                    )}
                                </div>

                                <div className="allowance-meter-item showcase-item">
                                    <div className="meter-top-row">
                                        <span className="meter-icon-label">📸 Match Showcase Photos</span>
                                        <span className="meter-showcase-badge">Up to 6 Photos Active</span>
                                    </div>
                                    <span className="meter-caption">Students browse up to 6 of your photos in Match (regular accounts capped at 3).</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Standard Premium User Upsell to Ultra */}
                    {!isUltraUser && (
                        <div className="upgrade-to-ultra-banner">
                            <div className="ultra-banner-left">
                                <span className="ultra-banner-icon">👑⭐</span>
                                <div>
                                    <h4>Upgrade to Elite Ultra VIP</h4>
                                    <p>Unlock 30 Super Swipes/mo, 10 24h Boosts/mo & up to 6 Match photos.</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                className="btn-ultra-banner-upgrade"
                                onClick={() => {
                                    setShowManagePlans(true);
                                    setTierCategory('ultra');
                                    setSelectedTierId('ultra_3month');
                                }}
                            >
                                View Ultra Plans →
                            </button>
                        </div>
                    )}

                    {/* Direct Value Action Shortcuts */}
                    <div className="active-shortcuts-grid">
                        <button
                            type="button"
                            className="active-shortcut-card"
                            onClick={() => navigate('/viewers')}
                        >
                            <span className="shortcut-icon">👀</span>
                            <div className="shortcut-meta">
                                <span className="shortcut-label">Secret Admirers</span>
                                <span className="shortcut-sub">See who viewed you</span>
                            </div>
                            <span className="shortcut-arrow">→</span>
                        </button>

                        <button
                            type="button"
                            className="active-shortcut-card"
                            onClick={() => navigate('/profile/edit')}
                        >
                            <span className="shortcut-icon">🎬</span>
                            <div className="shortcut-meta">
                                <span className="shortcut-label">{isUltra ? '30s HD Video Profile' : '10s Video Profile'}</span>
                                <span className="shortcut-sub">{isUltra ? 'Triple length VIP video showcase' : 'Showcase your vibe'}</span>
                            </div>
                            <span className="shortcut-arrow">→</span>
                        </button>

                        <button
                            type="button"
                            className="active-shortcut-card"
                            onClick={() => navigate('/match')}
                        >
                            <span className="shortcut-icon">⚡</span>
                            <div className="shortcut-meta">
                                <span className="shortcut-label">Unlimited Swiping</span>
                                <span className="shortcut-sub">No 20-swipe daily limits</span>
                            </div>
                            <span className="shortcut-arrow">→</span>
                        </button>
                    </div>

                    <button
                        type="button"
                        className="btn-toggle-manage"
                        onClick={() => setShowManagePlans(true)}
                    >
                        Extend or Manage Membership Plans ↓
                    </button>
                </div>
            )}

            {/* ── Core Presentation (Rendered if not premium OR if user opened manage plans) ── */}
            {(!isPremium || showManagePlans) && (
                <>
                    {/* Social Proof Pill */}
                    <div className="social-proof-banner">
                        <span className="pulse-dot"></span>
                        <span><strong>2,500+ campus daters</strong> unlocked Elite this week</span>
                    </div>

                    {/* Compact Hero Section */}
                    <header className="premium-hero">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="hero-badge-wrap"
                        >
                            <div className="hero-emblem-ring">
                                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="crown-svg">
                                    <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"></path>
                                </svg>
                            </div>
                        </motion.div>
                        <h1 className="hero-title">The Ultimate Campus Dating Edge</h1>
                        <p className="hero-subtitle">
                            Get seen first, unlock admirers, and connect with top students across your university.
                        </p>
                        <ContextualTip
                            featureId="premium_benefits"
                            onLearnMore={() => setGuideModalOpen(true)}
                        />
                    </header>

                    {/* Special 3-Day Free Trial Banner for Students */}
                    {!isPremium && (
                        <div 
                            className="premium-trial-banner"
                            onClick={() => {
                                setPaywallTrigger('repeated_premium_visits');
                                setPaywallOpen(true);
                            }}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className="trial-banner-top">
                                <span className="trial-banner-badge">🎁 SPECIAL STUDENT OFFER</span>
                                <span className="trial-banner-chip">₦0.00 TODAY</span>
                            </div>
                            <div className="trial-banner-body">
                                <h4>Hesitant to subscribe? Try 3 Days Free</h4>
                                <p>Test unblurred admirers, top 10% placement, and unlimited swipes risk-free. Zero payment today.</p>
                            </div>
                            <div className="trial-banner-action">
                                <button type="button" className="btn-trial-banner-cta">
                                    Claim 3-Day Free Trial →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── 3-Duration Membership Selector (Front & Center) ── */}
                    <div className="plan-selection-section">
                        <div className="section-label-row">
                            <span className="section-label">CHOOSE YOUR MEMBERSHIP</span>
                            <span className="section-sublabel">Safe, CBN-regulated checkout</span>
                        </div>

                        {/* Tier Category Segmented Switcher */}
                        <div className="tier-category-toggle" role="tablist" aria-label="Membership Tiers">
                            <button
                                type="button"
                                role="tab"
                                aria-selected={tierCategory === 'premium'}
                                className={`tier-toggle-pill ${tierCategory === 'premium' ? 'active' : ''}`}
                                onClick={() => {
                                    setTierCategory('premium');
                                    setSelectedTierId('premium_3month');
                                }}
                            >
                                👑 Elite Premium
                                <span className="toggle-price-chip">from ₦2,900/mo</span>
                            </button>

                            <button
                                type="button"
                                role="tab"
                                aria-selected={tierCategory === 'ultra'}
                                className={`tier-toggle-pill ultra-pill ${tierCategory === 'ultra' ? 'active' : ''}`}
                                onClick={() => {
                                    setTierCategory('ultra');
                                    setSelectedTierId('ultra_3month');
                                }}
                            >
                                👑⭐ Elite Ultra
                                <span className="toggle-price-chip ultra-chip">VIP • ₦15k/mo</span>
                            </button>
                        </div>

                        {/* Ultra Perks Summary Highlight */}
                        {tierCategory === 'ultra' && (
                            <div className="ultra-perks-highlight-card animate-fade-in">
                                <div className="ultra-perks-header">
                                    <span className="ultra-badge-chip">👑⭐ THE CAMPUS CELEBRITY TIER • ₦25,000 MONTHLY VALUE</span>
                                    <h4>Instant Results & VIP Dominance</h4>
                                </div>
                                <div className="ultra-perks-grid">
                                    <div className="ultra-perk-item">
                                        <span className="perk-icon">💬</span>
                                        <div>
                                            <strong>Unrestricted Contact Sharing</strong>
                                            <span>Freely ask for & share WhatsApp, phone numbers & social handles without filter blocks</span>
                                        </div>
                                    </div>
                                    <div className="ultra-perk-item">
                                        <span className="perk-icon">📱</span>
                                        <div>
                                            <strong>Public Bio Contact Display</strong>
                                            <span>Add your WhatsApp & Instagram directly to your profile bio with zero masking</span>
                                        </div>
                                    </div>
                                    <div className="ultra-perk-item">
                                        <span className="perk-icon">🎬</span>
                                        <div>
                                            <strong>Extended 30s HD Video Profile</strong>
                                            <span>Triple the video duration (30s vs 10s) to show your true vibe and campus personality</span>
                                        </div>
                                    </div>
                                    <div className="ultra-perk-item">
                                        <span className="perk-icon">⭐</span>
                                        <div>
                                            <strong>30 Super Swipes / mo</strong>
                                            <span>Direct crush alerts (₦15,000 value included)</span>
                                        </div>
                                    </div>
                                    <div className="ultra-perk-item">
                                        <span className="perk-icon">🚀</span>
                                        <div>
                                            <strong>10 24h Boosts / mo</strong>
                                            <span>Dominate campus feeds (₦10,000 value included)</span>
                                        </div>
                                    </div>
                                    <div className="ultra-perk-item">
                                        <span className="perk-icon">📸</span>
                                        <div>
                                            <strong>Full 6-Photo Gallery</strong>
                                            <span>Showcase your full gallery on Match (Free accounts capped at 3)</span>
                                        </div>
                                    </div>
                                    <div className="ultra-perk-item">
                                        <span className="perk-icon">👑</span>
                                        <div>
                                            <strong>VIP Spotlight & Radiant Crowns</strong>
                                            <span>Prominent crowns & top feed priority in Explore, Confessions posts & comment threads</span>
                                        </div>
                                    </div>
                                    <div className="ultra-perk-item">
                                        <span className="perk-icon">✨</span>
                                        <div>
                                            <strong>All Elite Benefits Included</strong>
                                            <span>Unlimited Swipes, Unlimited Campus Finder, Secret Admirers, Unlimited HD Calls & Incognito Ghost Mode</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="ultra-allowance-isolation-note">
                                    🛡️ <strong>Zero Wallet Depletion:</strong> ₦25,000 worth of monthly allowances (30 Super Swipes + 10 Boosts) are included directly with your membership and never touch your campus wallet or coin balance.
                                </div>
                            </div>
                        )}

                        <div className="subscription-tiers-grid">
                            {activeTiers.map((tier) => {
                                const isSelected = selectedTierId === tier.id;
                                return (
                                    <button
                                        key={tier.id}
                                        type="button"
                                        className={`tier-card-selector ${isSelected ? 'selected' : ''} ${tierCategory === 'ultra' ? 'ultra-tier-card' : ''}`}
                                        onClick={() => {
                                            setSelectedTierId(tier.id);
                                            markFeatureUsed('premium_benefits');
                                        }}
                                        aria-pressed={isSelected}
                                    >
                                        {tier.tag && (
                                            <span className={`tier-badge-pill ${tier.isPopular ? 'popular-pill' : 'value-pill'}`}>
                                                {tier.tag}
                                            </span>
                                        )}
                                        <span className="tier-duration-heading">{tier.name}</span>
                                        <div className="tier-rate-row">
                                            <span className="tier-rate-value">{tier.rateLabel}</span>
                                            <span className="tier-rate-per">{tier.perPeriod}</span>
                                        </div>
                                        <span className="tier-daily-anchor">{tier.dailyRate}</span>
                                        <div className="tier-radio-indicator">
                                            <div className="radio-dot"></div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Dynamic Explainer */}
                        <div className="plan-summary-box">
                            <div className="summary-calc">
                                <span className="summary-price-badge">
                                    ₦{currentTier.price.toLocaleString()}
                                </span>
                                <span className="summary-text">
                                    {currentTier.id === 'premium_monthly' && 'Billed monthly. Cancel anytime.'}
                                    {currentTier.id === 'premium_3month' && 'Billed quarterly at ₦7,200 (You save ₦1,500). Cancel anytime.'}
                                    {currentTier.id === 'premium_annual' && 'Billed yearly at ₦21,600 (You save ₦13,200). Cancel anytime.'}
                                    {currentTier.id === 'ultra_monthly' && 'Billed monthly at ₦15,000. 30 Super Swipes & 10 Boosts included.'}
                                    {currentTier.id === 'ultra_2month' && 'Billed for 2 months at ₦30,000. 30 Super Swipes & 10 Boosts included each month.'}
                                    {currentTier.id === 'ultra_3month' && '3 months for ₦35,000 (You save ₦10,000). 30 Super Swipes & 10 Boosts included each month.'}
                                </span>
                            </div>
                            <span className="summary-guarantee">🛡️ Instant activation via Card, Transfer, USSD, or Wallet</span>
                        </div>
                    </div>

                    {/* ── Key Outcome Benefits Grid ── */}
                    <div className="outcomes-grid">
                        {OUTCOME_HIGHLIGHTS.map((item, idx) => (
                            <div key={idx} className="outcome-card">
                                <span className="outcome-icon">{item.icon}</span>
                                <div className="outcome-copy">
                                    <h4 className="outcome-title">{item.title}</h4>
                                    <p className="outcome-sub">{item.outcome}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* ── Interactive Feature Deep-Dive (Collapsible) ── */}
                    <div className="preview-deepdive-toggle-wrap">
                        <button
                            type="button"
                            className="btn-deepdive-toggle"
                            onClick={() => setShowFeaturePreviews(!showFeaturePreviews)}
                        >
                            <span>{showFeaturePreviews ? 'Hide Interactive Previews ↑' : 'See Interactive Previews & Demos ↓'}</span>
                        </button>
                    </div>

                    {showFeaturePreviews && (
                        <div className="feature-preview-container animate-fade-in-up">
                            <div className="preview-segmented-pills">
                                {PREVIEW_TABS.map((tab) => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        className={`preview-pill-btn ${activeTab === tab.id ? 'active' : ''}`}
                                        onClick={() => setActiveTab(tab.id)}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Interactive Visual Mockup Stage */}
                            <div className="preview-stage-card">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={activeTab}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        transition={{ duration: 0.2 }}
                                        className="preview-stage-content"
                                    >
                                        <div className="stage-top-tag">
                                            <span className="stage-tag-badge">{activePreview.badge}</span>
                                            <span className="stage-tag-title">{activePreview.title}</span>
                                        </div>

                                        {/* Tab 1 Visual: Admirers Mock */}
                                        {activeTab === 'admirers' && (
                                            <div className="mockup-admirers-grid">
                                                <div className="mockup-student-card">
                                                    <div className="mockup-avatar avatar-1">
                                                        <span className="mockup-badge-like">❤️ Liked</span>
                                                    </div>
                                                    <div className="mockup-info">
                                                        <span className="mockup-name">Chidinma, 21</span>
                                                        <span className="mockup-dept">Pharmacy • 300L</span>
                                                    </div>
                                                </div>
                                                <div className="mockup-student-card">
                                                    <div className="mockup-avatar avatar-2">
                                                        <span className="mockup-badge-like">❤️ Liked</span>
                                                    </div>
                                                    <div className="mockup-info">
                                                        <span className="mockup-name">Tolu, 22</span>
                                                        <span className="mockup-dept">Economics • 400L</span>
                                                    </div>
                                                </div>
                                                <div className="mockup-student-card">
                                                    <div className="mockup-avatar avatar-3">
                                                        <span className="mockup-badge-like">❤️ Liked</span>
                                                    </div>
                                                    <div className="mockup-info">
                                                        <span className="mockup-name">Favour, 20</span>
                                                        <span className="mockup-dept">Mass Comm • 200L</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Tab 2 Visual: Spotlight Mock */}
                                        {activeTab === 'spotlight' && (
                                            <div className="mockup-spotlight-display">
                                                <div className="spotlight-rank-banner">
                                                    <span className="rank-pulse"></span>
                                                    <span>#1 In Campus Discovery Queue</span>
                                                </div>
                                                <div className="spotlight-card-wrapper">
                                                    <div className="spotlight-avatar-demo">
                                                        <div className="spotlight-crown-badge">👑 Top Pick</div>
                                                        <div className="spotlight-views-pill">⚡ 10x Profile Views</div>
                                                    </div>
                                                    <div className="spotlight-meta-demo">
                                                        <span className="spotlight-demo-title">You're at the top of the stack</span>
                                                        <span className="spotlight-demo-sub">Visible to every active student in your university</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Tab 3 Visual: 10s Live Video Mock */}
                                        {activeTab === 'video' && (
                                            <div className="mockup-video-display">
                                                <div className="video-card-demo">
                                                    <div className="video-player-frame">
                                                        <span className="video-play-btn">▶</span>
                                                        <span className="video-duration-pill">{tierCategory === 'ultra' ? '0:30' : '0:10'}</span>
                                                        <div className="video-soundwave-anim">
                                                            <span className="bar bar-1"></span>
                                                            <span className="bar bar-2"></span>
                                                            <span className="bar bar-3"></span>
                                                            <span className="bar bar-4"></span>
                                                            <span className="bar bar-2"></span>
                                                        </div>
                                                    </div>
                                                    <div className="video-verified-badge">
                                                        <span>✓ Authentic Voice & Smile Verified</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <p className="stage-outcome-text">{activePreview.description}</p>
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </div>
                    )}

                    {/* ── FAQ Accordion ── */}
                    <div className="faq-section">
                        <h3 className="faq-heading">Frequently Asked Questions</h3>
                        <div className="faq-list">
                            {FAQS.map((faq, index) => {
                                const isOpen = openFaqIndex === index;
                                return (
                                    <div key={index} className={`faq-item ${isOpen ? 'open' : ''}`}>
                                        <button
                                            type="button"
                                            className="faq-question-btn"
                                            onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                                        >
                                            <span>{faq.question}</span>
                                            <span className="faq-chevron">{isOpen ? '−' : '+'}</span>
                                        </button>
                                        {isOpen && (
                                            <div className="faq-answer-body">
                                                <p>{faq.answer}</p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Sticky Action Dock (Always visible on mobile) ── */}
                    <div className="premium-sticky-dock">
                        <div className="dock-inner">
                            <button
                                type="button"
                                className="btn-dock-upgrade glow-effect"
                                onClick={handleSubscribe}
                                disabled={isProcessing}
                            >
                                <span className="dock-btn-main">
                                    {isProcessing
                                        ? 'Activating Subscription...'
                                        : isUltraUser && tierCategory === 'ultra'
                                            ? `Extend Elite Ultra — ${currentTier.rateLabel} ${currentTier.perPeriod}`
                                            : isPremium && tierCategory === 'premium'
                                                ? `Extend Membership — ${currentTier.rateLabel} ${currentTier.perPeriod}`
                                                : tierCategory === 'ultra'
                                                    ? `Upgrade to Elite Ultra — ${currentTier.rateLabel} ${currentTier.perPeriod}`
                                                    : `Upgrade to Elite — ${currentTier.rateLabel} ${currentTier.perPeriod}`}
                                </span>
                                <span className="dock-btn-sub">
                                    Pay ₦{currentTier.price.toLocaleString()} • 100% Secure Checkout
                                </span>
                            </button>

                            {/* Wallet Option */}
                            {wallet?.available_balance >= currentTier.price ? (
                                <button
                                    type="button"
                                    className="btn-dock-wallet"
                                    onClick={handlePayWithWallet}
                                    disabled={isProcessing}
                                >
                                    Or pay ₦{currentTier.price.toLocaleString()} from Wallet (Bal: ₦{wallet.available_balance.toLocaleString()})
                                </button>
                            ) : (
                                <div className="dock-wallet-hint">
                                    <span>Campus Wallet: ₦{wallet?.available_balance?.toLocaleString() || 0}</span>
                                    <button
                                        type="button"
                                        className="dock-fund-link"
                                        onClick={() => navigate('/wallet')}
                                    >
                                        + Fund Wallet
                                    </button>
                                </div>
                            )}

                            {/* Trust micro-strip */}
                            <div className="dock-trust-strip">
                                <span className="trust-item">🔒 256-bit SSL</span>
                                <span className="trust-separator">•</span>
                                <span className="trust-item">🛡️ CBN-Licensed Paystack</span>
                                <span className="trust-separator">•</span>
                                <span className="trust-item">⚡ 1-Tap Cancel</span>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* ── A-La-Carte Power-Ups (Microtransactions) ── */}
            <div className="microtransactions-section">
                <div className="section-label-row">
                    <span className="section-label">⚡ INSTANT POWER-UPS</span>
                    <span className="section-sublabel">No subscription required</span>
                </div>

                <div className="boost-grid">
                    <div className={`boost-card ${boostData.hasBoosted ? 'boost-active' : ''}`}>
                        <div className="boost-card-header">
                            <span className="boost-icon">🚀</span>
                            <div className="boost-titles">
                                <h4>24h Visibility Boost</h4>
                                <span className="boost-price-tag">₦1,000</span>
                            </div>
                        </div>
                        <p className="boost-desc">Jump straight to the top of everyone's campus feed for a full 24 hours.</p>
                        {boostData.hasBoosted && boostTimeRemaining ? (
                            <div className="boost-active-pill">
                                <span className="boost-pulse"></span>
                                Active — {boostTimeRemaining} remaining
                            </div>
                        ) : (
                            <button
                                type="button"
                                className="btn-boost-action"
                                onClick={() => handlePurchaseBoost('24h_boost')}
                                disabled={processingBoost === '24h_boost'}
                            >
                                {processingBoost === '24h_boost' ? 'Purchasing...' : 'Get 24h Boost — ₦1,000'}
                            </button>
                        )}
                    </div>

                    <div className="boost-card">
                        <div className="boost-card-header">
                            <span className="boost-icon">⭐</span>
                            <div className="boost-titles">
                                <h4>Super Swipe</h4>
                                <span className="boost-price-tag">₦500 / credit</span>
                            </div>
                        </div>
                        <p className="boost-desc">Send an instant priority notification so your crush knows you liked them.</p>
                        {boostData.superSwipeCount > 0 && (
                            <div className="super-swipe-pill">
                                {boostData.superSwipeCount} credits ready to use
                            </div>
                        )}
                        <button
                            type="button"
                            className="btn-boost-action"
                            onClick={() => handlePurchaseBoost('super_swipe')}
                            disabled={processingBoost === 'super_swipe'}
                        >
                            {processingBoost === 'super_swipe' ? 'Purchasing...' : 'Get 1 Super Swipe — ₦500'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Direct Human Support */}
            <footer className="elite-support-footer">
                <p>
                    Questions about billing or activation?{' '}
                    <a
                        href="https://wa.me/2349160264415?text=Hi%20👋%20I%20have%20a%20question%20about%20CollegeDate%20Premium"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Chat with Student Support on WhatsApp →
                    </a>
                </p>
            </footer>

            <AppGuideModal
                isOpen={guideModalOpen}
                onClose={() => setGuideModalOpen(false)}
                initialFeatureId="premium_benefits"
            />

            {/* Contextual 3-Day Trial Bottom Sheet */}
            <ContextualPaywallSheet
                isOpen={paywallOpen}
                onClose={() => setPaywallOpen(false)}
                triggerSource={paywallTrigger}
                onSuccess={() => {
                    loadSubscription(true);
                    if (currentUser?.id && fetchProfile) fetchProfile(currentUser.id);
                }}
            />
        </div>
    );
}
