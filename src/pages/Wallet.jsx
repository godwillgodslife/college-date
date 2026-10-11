import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    getWallet,
    getTransactions,
    PAYSTACK_PRODUCTS,
    startPaystackPayment,
    openHostedPaystackCheckout,
    getPayoutDetails,
    updatePayoutDetails,
    requestWalletWithdrawal
} from '../services/paymentService';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import { supabase } from '../lib/supabase';
import { getCachedData, setCachedData } from '../lib/persistentCache';
import { CACHE_TTL } from '../lib/cachePolicy';
import { useActiveProgram } from '../hooks/useActiveProgram';
import CollegeDateActiveModal from '../components/CollegeDateActiveModal';
import './Wallet.css';

const FUNDING_OPTIONS = [
    { amount: 1000, productId: PAYSTACK_PRODUCTS.walletTopUps[1000] },
    { amount: 2500, productId: PAYSTACK_PRODUCTS.walletTopUps[2500] },
    { amount: 5000, productId: PAYSTACK_PRODUCTS.walletTopUps[5000] },
    { amount: 10000, productId: PAYSTACK_PRODUCTS.walletTopUps[10000] }
];

const isNativeAndroid = () => {
    if (typeof window === 'undefined' || !window.Capacitor?.isNativePlatform?.()) return false;
    return window.Capacitor.getPlatform?.() === 'android';
};

export default function Wallet() {
    const navigate = useNavigate();
    const { currentUser, userProfile } = useAuth();
    const { addToast } = useToast();

    const [wallet, setWallet] = useState(() => {
        if (!currentUser?.id) return null;
        return getCachedData(['wallet', currentUser.id], { ttlMs: CACHE_TTL.wallet, allowStale: true })
            || getCachedData(['auth-wallet', currentUser.id], { ttlMs: CACHE_TTL.wallet, allowStale: true })
            || null;
    });
    const [transactions, setTransactions] = useState(() => {
        if (!currentUser?.id) return [];
        return getCachedData(['wallet-transactions', currentUser.id], { ttlMs: CACHE_TTL.wallet, allowStale: true }) || [];
    });
    const [loading, setLoading] = useState(() => !wallet);
    const [fundingAmount, setFundingAmount] = useState('1000');
    const [withdrawalAmount, setWithdrawalAmount] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [activeActionTab, setActiveActionTab] = useState('topup');
    const [escrowBalance, setEscrowBalance] = useState(0);
    const [activeModalOpen, setActiveModalOpen] = useState(false);
    const {
        enrolled: activeEnrolled,
        accruedEarnings: activeEarnings,
        qualifyingDaysCount,
        todayQualified
    } = useActiveProgram(currentUser?.id);

    const [payoutDetails, setPayoutDetails] = useState({
        bank_name: '',
        account_number: '',
        account_name: '',
        paypal_email: '',
        preferred_method: 'bank'
    });

    const [payoutCountdown, setPayoutCountdown] = useState('');

    useEffect(() => {
        const calculateCountdown = () => {
            const now = new Date();
            const nextFriday = new Date();
            // 5 is Friday
            nextFriday.setDate(now.getDate() + (7 + 5 - now.getDay()) % 7);
            if (now.getDay() === 5 && now.getHours() >= 12) {
                nextFriday.setDate(nextFriday.getDate() + 7);
            }
            nextFriday.setHours(12, 0, 0, 0);

            const diff = nextFriday - now;
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

            setPayoutCountdown(`${days}d ${hours}h ${mins}m`);
        };

        calculateCountdown();
        const timer = setInterval(calculateCountdown, 60000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!currentUser) return;

        const hasCached = Boolean(wallet);
        loadWalletData(!hasCached);
        sweepPendingFunds();

        // Subscribe to real-time wallet updates
        const walletSubscription = supabase
            .channel(`wallet_updates:${currentUser.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'wallets',
                    filter: `user_id=eq.${currentUser.id}`
                },
                (payload) => {
                    console.log('💰 Wallet updated via Realtime:', payload.new);
                    setWallet(payload.new);
                    setCachedData(['wallet', currentUser.id], payload.new);
                    // Also reload transactions to show the new entry silently
                    loadWalletData(false);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(walletSubscription);
        };
    }, [currentUser]);

    async function sweepPendingFunds() {
        try {
            // Silently attempt to unlock any funds that have passed their 30-day pending period
            await supabase.rpc('process_pending_referral_funds', { p_user_id: currentUser.id });
        } catch (err) {
            console.error('Silent sweep error:', err);
        }
    }

    async function loadWalletData(showLoading = true) {
        if (showLoading && !wallet) setLoading(true);
        try {
            const { data: walletData, error: walletError } = await getWallet(currentUser.id);
            if (walletError) throw walletError;
            setWallet(walletData);
            setCachedData(['wallet', currentUser.id], walletData);

            // Only load transactions if wallet has a real DB id
            if (walletData && walletData.id) {
                const { data: txData, error: txError } = await getTransactions(walletData.id);
                if (txError) throw txError;
                setTransactions(txData || []);
                setCachedData(['wallet-transactions', currentUser.id], txData || []);
            }

            // Load Payout Details
            try {
                const { data: payoutData } = await getPayoutDetails(currentUser.id);
                if (payoutData) {
                    setPayoutDetails(payoutData);
                }
            } catch (payoutErr) {
                // Payout details are optional, don't crash
                console.warn('Could not load payout details:', payoutErr);
            }

            // Load Escrow balance from active service deals
            try {
                const { data: dealsData } = await supabase
                    .from('service_deals')
                    .select('amount, status')
                    .eq('client_id', currentUser.id)
                    .in('status', ['funded', 'completed']);
                const totalEscrow = (dealsData || []).reduce((sum, d) => sum + Number(d.amount || 0), 0);
                setEscrowBalance(totalEscrow);
            } catch (escrowErr) {
                console.warn('Could not load escrow deals:', escrowErr);
            }
        } catch (err) {
            console.error('Error loading wallet data:', err);
            // Still set a default wallet so the page renders
            setWallet({
                id: null,
                user_id: currentUser.id,
                available_balance: 0,
                pending_balance: 0,
                total_earned: 0,
            });
        } finally {
            setLoading(false);
        }
    }

    const handleFunding = async (e) => {
        e.preventDefault();
        const amount = parseFloat(fundingAmount);
        const selectedFundingProduct = FUNDING_OPTIONS.find(option => option.amount === amount);

        if (isNaN(amount) || amount < 1000) {
            addToast('Minimum deposit is ₦1,000', 'warning');
            return;
        }

        if (!selectedFundingProduct) {
            addToast('Choose one of the available wallet top-up amounts.', 'warning');
            return;
        }

        setIsProcessing(true);

        if (!wallet || !wallet.id) {
            addToast('Wallet not initialized yet. Please complete your profile or contact support.', 'error');
            setIsProcessing(false);
            return;
        }

        try {
            const { data: payment, error } = await startPaystackPayment(selectedFundingProduct.productId);
            if (error) throw new Error(error);
            // openHostedPaystackCheckout(payment)
            await openHostedPaystackCheckout(payment, {
                onClose: () => {
                    loadWalletData();
                    setIsProcessing(false);
                }
            });
        } catch (err) {
            console.error('Funding error:', err);
            addToast(err.message, 'error');
            setIsProcessing(false);
        }
    };

    const handleWithdrawal = async (e) => {
        e.preventDefault();
        const amount = parseFloat(withdrawalAmount);

        // Validation
        if (isNaN(amount) || amount < 15000) {
            addToast('Minimum withdrawal for earnings is ₦15,000', 'warning');
            return;
        }

        if (!wallet || !wallet.id) {
            addToast('Wallet not initialized yet. Please complete your profile or contact support.', 'error');
            return;
        }

        if (amount > (wallet?.available_balance || 0)) {
            addToast('Insufficient balance', 'error');
            return;
        }

        if (!payoutDetails?.bank_name?.trim() || !payoutDetails?.account_number?.trim() || !payoutDetails?.account_name?.trim()) {
            addToast('Please enter and save your bank payout details below before requesting a withdrawal.', 'warning');
            return;
        }

        const cleanAccNum = payoutDetails.account_number.trim().replace(/\D/g, '');
        if (cleanAccNum.length !== 10) {
            addToast('Nigerian bank account numbers must be exactly 10 digits.', 'warning');
            return;
        }

        setIsProcessing(true);
        try {
            const { error } = await requestWalletWithdrawal(amount, {
                bank_name: payoutDetails.bank_name.trim(),
                account_number: cleanAccNum,
                account_name: payoutDetails.account_name.trim(),
                preferred_method: 'bank'
            });

            if (error) throw new Error(error);

            addToast('Withdrawal request submitted! Payouts are processed weekly.', 'success');
            loadWalletData();
            setWithdrawalAmount('');
        } catch (err) {
            addToast(err.message, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSavePayout = async (e) => {
        e.preventDefault();
        setIsProcessing(true);
        try {
            const { error } = await updatePayoutDetails(currentUser.id, payoutDetails);
            if (error) throw error;
            addToast('Payout details saved successfully!', 'success');
        } catch (err) {
            addToast(err.message, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    if (loading) return <LoadingSpinner fullScreen />;

    const isFemale = (userProfile?.role || userProfile?.gender || '').toLowerCase() === 'female';
    const isLady = isFemale;

    return (
        <div className="wallet-page animated fadeIn">
            <div className="wallet-header">
                <button type="button" className="wallet-back-btn" onClick={() => navigate(-1)} aria-label="Go back">
                    ←
                </button>
                <h1>Student Wallet & Rewards</h1>
                <p>Top up for power-ups or withdraw campus referral and ambassador rewards.</p>
                <a href="https://wa.me/2349160264415?text=Hi%20👋%20I%20need%20help%20with%20my%20wallet/payout"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="wallet-support-link">
                    Need help? Chat with Support
                </a>
            </div>

            <div className="payout-info-banner glass animate-fade-in">
                <div className="banner-content">
                    <span className="banner-icon">⚡</span>
                    <div className="banner-text">
                        <strong>Ambassador & Referral Settlements:</strong>
                        <span className="countdown-timer">{payoutCountdown ? `Next settlement: ${payoutCountdown}` : 'Weekly Every Friday'}</span>
                    </div>
                </div>
                <div className="banner-badge">Weekly Every Friday</div>
            </div>

            {/* College Date Active Card (Strictly Female Ambassador Cohort) */}
            {isFemale && (
                <div 
                    className="wallet-active-program-card glass animate-fade-in"
                    onClick={() => setActiveModalOpen(true)}
                    style={{
                        margin: '1rem 0',
                        padding: '1rem 1.25rem',
                        background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.14), rgba(16, 185, 129, 0.1))',
                        border: '1px solid rgba(255, 215, 0, 0.35)',
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <span style={{ fontSize: '2rem' }}>⚡</span>
                        <div>
                            <div style={{ fontWeight: '800', fontSize: '1rem', color: '#ffd700' }}>
                                College Date Active: ₦{activeEarnings?.toLocaleString()}
                            </div>
                            <div style={{ fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                                {activeEnrolled 
                                    ? (todayQualified ? `✓ Today's +₦${dailyReward || 625} Qualified — Settles on 28th` : `${qualifyingDaysCount}/${minQualifyingDays || 24} qualifying days completed`)
                                    : 'Earn up to ₦15,000/mo through genuine campus participation.'}
                            </div>
                        </div>
                    </div>
                    <button 
                        type="button" 
                        className="btn btn-primary"
                        style={{ padding: '6px 14px', fontSize: '0.82rem', borderRadius: '999px', background: '#ffd700', color: '#000', fontWeight: '700' }}
                    >
                        {activeEnrolled ? 'View →' : 'Join'}
                    </button>
                </div>
            )}

            <div className="wallet-overview-grid">
                <div className="balance-card">
                    <span className="balance-label">Available Balance</span>
                    <h2 className="balance-amount">
                        ₦{parseFloat(wallet?.available_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </h2>

                    {parseFloat(wallet?.pending_balance || 0) > 0 && (
                        <div className="pending-balance-info" style={{ marginTop: '10px', padding: '12px', background: 'rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '14px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <span style={{ color: 'rgba(255,255,255,0.8)' }}>🔒 Locked Earnings</span>
                                <span style={{
                                    padding: '2px 8px',
                                    background: 'rgba(252, 182, 119, 0.2)',
                                    color: '#fcb677',
                                    borderRadius: '100px',
                                    fontSize: '11px',
                                    fontWeight: 'bold',
                                    textTransform: 'uppercase'
                                }}>
                                    {wallet?.pending_maturity_date ? (
                                        Math.max(0, Math.ceil((new Date(wallet.pending_maturity_date) - new Date()) / (1000 * 60 * 60 * 24))) + ' Days Left'
                                    ) : '30 Days Left'}
                                </span>
                            </div>
                            <span style={{ display: 'block', fontWeight: 'bold', fontSize: '18px' }}>
                                ₦{parseFloat(wallet?.pending_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                            <p style={{ margin: '8px 0 0', fontSize: '11px', color: 'var(--text-dim)', lineHeight: '1.4' }}>
                                Referral bonuses are locked for 30 days to prevent fraud. They will automatically move to your available balance once matured.
                            </p>
                        </div>
                    )}

                    <div className="wallet-action-tabs" style={{ display: 'flex', gap: '8px', margin: '14px 0 10px' }}>
                        <button
                            type="button"
                            className={`btn ${activeActionTab === 'topup' ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem', borderRadius: '10px' }}
                            onClick={() => setActiveActionTab('topup')}
                        >
                            ⚡ Add Funds
                        </button>
                        <button
                            type="button"
                            className={`btn ${activeActionTab === 'withdraw' ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem', borderRadius: '10px' }}
                            onClick={() => setActiveActionTab('withdraw')}
                        >
                            💸 Withdraw
                        </button>
                    </div>

                    {activeActionTab === 'topup' ? (
                        <div className="wallet-actions">
                            <form onSubmit={handleFunding} className="funding-form">
                                <label className="form-label">Top up via Paystack</label>
                                {isNativeAndroid() && (
                                    <p style={{ margin: '0 0 0.75rem', color: 'var(--text-dim)', fontSize: '0.85rem', lineHeight: 1.45 }}>
                                        Instant wallet funding via card, bank transfer, or USSD.
                                    </p>
                                )}
                                <div className="input-group">
                                    <select
                                        value={fundingAmount}
                                        onChange={(e) => setFundingAmount(e.target.value)}
                                        className="funding-input"
                                        disabled={isProcessing}
                                    >
                                        {FUNDING_OPTIONS.map(option => (
                                            <option key={option.productId} value={option.amount}>
                                                NGN {option.amount.toLocaleString()}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        type="submit"
                                        className="btn btn-primary btn-fund"
                                        disabled={isProcessing}
                                    >
                                        {isProcessing ? '...' : 'Add Funds'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : (
                        <div className="wallet-actions">
                            <form onSubmit={handleWithdrawal} className="funding-form">
                                <label className="form-label">Min ₦15,000 Ambassador Withdrawal</label>
                                <div className="input-group">
                                    <input
                                        type="number"
                                        placeholder="Amount in NGN"
                                        value={withdrawalAmount}
                                        onChange={(e) => setWithdrawalAmount(e.target.value)}
                                        className="funding-input"
                                        disabled={isProcessing}
                                    />
                                    <button
                                        type="submit"
                                        className="btn btn-primary btn-fund"
                                        disabled={isProcessing}
                                    >
                                        {isProcessing ? '...' : 'Withdraw'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>

                <div className="stats-card-grid">
                    <div className="mini-stat-card">
                        <span className="mini-label">Pending</span>
                        <span className="mini-value">₦{parseFloat(wallet?.pending_balance || 0).toLocaleString()}</span>
                    </div>
                    <div className="mini-stat-card">
                        <span className="mini-label">Total Earned</span>
                        <span className="mini-value">₦{parseFloat(wallet?.total_earned || 0).toLocaleString()}</span>
                    </div>
                    <div className="mini-stat-card escrow-card">
                        <span className="mini-label">🤝 In Escrow</span>
                        <span className="mini-value">₦{parseFloat(escrowBalance || 0).toLocaleString()}</span>
                    </div>
                </div>

                {/* Gift Stats Section */}
                <div className="gift-stats-container">
                    <h3>🎁 Gift Earnings</h3>
                    <div className="gift-stats-grid">
                        <div className="gift-stat">
                            <span className="stat-val">
                                {transactions.filter(t => t.type === 'gift_received').length}
                            </span>
                            <span className="stat-lbl">Gifts Received</span>
                        </div>
                        <div className="gift-stat">
                            <span className="stat-val">
                                ₦{transactions
                                    .filter(t => t.type === 'gift_received')
                                    .reduce((acc, curr) => acc + parseFloat(curr.amount), 0)
                                    .toLocaleString()}
                            </span>
                            <span className="stat-lbl">From Gifts</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="payout-instructions-card glass animate-fade-in-up">
                <h3>💡 How to Get Paid</h3>
                <div className="instruction-grid">
                    <div className="step">
                        <p><strong>1.</strong> Earn <strong>₦15,000</strong> or more from swipes and gifts.</p>
                    </div>
                    <div className="step">
                        <p><strong>2.</strong> Request a withdrawal below to the payout queue.</p>
                    </div>
                    <div className="step">
                        <p><strong>3.</strong> Payments are processed every <strong>Friday at 12 PM</strong>.</p>
                    </div>
                </div>
            </div>

            <section className="payout-section">
                <h2 className="section-title">Bank Payout Information</h2>
                <p className="section-subtitle">Where should we send your referral and ambassador cash earnings?</p>

                <form onSubmit={handleSavePayout} className="payout-form">
                    <div className="payout-info-grid">
                        <div className="payout-form-group">
                            <label>Bank Name</label>
                            <input
                                type="text"
                                className="payout-input"
                                placeholder="e.g. GTBank, Kuda, Access, OPay, Zenith"
                                value={payoutDetails.bank_name || ''}
                                onChange={(e) => setPayoutDetails({ ...payoutDetails, bank_name: e.target.value, preferred_method: 'bank' })}
                            />
                        </div>
                        <div className="payout-form-group">
                            <label>Account Number</label>
                            <input
                                type="text"
                                className="payout-input"
                                placeholder="0123456789"
                                value={payoutDetails.account_number || ''}
                                onChange={(e) => setPayoutDetails({ ...payoutDetails, account_number: e.target.value, preferred_method: 'bank' })}
                            />
                        </div>
                        <div className="payout-form-group payout-full-row">
                            <label>Account Name</label>
                            <input
                                type="text"
                                className="payout-input"
                                placeholder="Full name as registered on your bank account"
                                value={payoutDetails.account_name || ''}
                                onChange={(e) => setPayoutDetails({ ...payoutDetails, account_name: e.target.value, preferred_method: 'bank' })}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-save-payout"
                        disabled={isProcessing}
                    >
                        {isProcessing ? 'Saving...' : 'Save Payout Details'}
                    </button>
                </form>
            </section>

            <section className="transaction-history">
                <h2 className="section-title">Recent Activity</h2>
                {transactions.length > 0 ? (
                    <div className="transaction-list">
                        {transactions.map(tx => (
                            <div key={tx.id} className="transaction-item">
                                <div className={`tx-icon icon-${tx.type}`}>
                                    {tx.type === 'deposit' ? '💰' : tx.type === 'swipe_reward' ? '⭐' : tx.type === 'swipe_purchase' ? '💸' : tx.type === 'referral_bonus' ? '🤝' : '🎁'}
                                </div>
                                <div className="tx-info">
                                    <span className="tx-type">{tx.type.replace('_', ' ').charAt(0).toUpperCase() + tx.type.replace('_', ' ').slice(1)}</span>
                                    <span className="tx-description">{tx.description}</span>
                                    <div className="tx-date-row">
                                        <span className="tx-date">{new Date(tx.created_at).toLocaleDateString()}</span>
                                        {tx.status === 'pending' && tx.unlocks_at && (
                                            <span className="tx-unlock-date"> • Unlocks: {new Date(tx.unlocks_at).toLocaleDateString()}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="tx-amount-status">
                                    <span className={`tx-amount mont-${tx.type}`}>
                                        {tx.type === 'withdrawal' || tx.type === 'swipe_purchase' ? '-' : '+'}
                                        ₦{parseFloat(tx.amount).toLocaleString()}
                                    </span>
                                    <span className={`tx-status status-${tx.status}`}>
                                        {tx.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="no-transactions">
                        <div className="empty-icon">💸</div>
                        <p>No transactions yet.</p>
                    </div>
                )}
            </section>

            <CollegeDateActiveModal
                isOpen={activeModalOpen}
                onClose={() => setActiveModalOpen(false)}
                userId={currentUser?.id}
            />
        </div >
    );
}
