import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
    getWallet,
    getTransactions,
    createTransaction,
    completeTransaction,
    initializePaystack,
    getPayoutDetails,
    updatePayoutDetails
} from '../services/paymentService';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import { supabase } from '../lib/supabase';
import './Wallet.css';

export default function Wallet() {
    const { currentUser, userProfile } = useAuth();
    const { addToast } = useToast();

    const [wallet, setWallet] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fundingAmount, setFundingAmount] = useState('2000');
    const [withdrawalAmount, setWithdrawalAmount] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

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

        loadWalletData();
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
                    // Also reload transactions to show the new entry
                    loadWalletData();
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

    async function loadWalletData() {
        setLoading(true);
        try {
            const { data: walletData, error: walletError } = await getWallet(currentUser.id);
            if (walletError) throw walletError;
            setWallet(walletData);

            // Only load transactions if wallet has a real DB id
            if (walletData && walletData.id) {
                const { data: txData, error: txError } = await getTransactions(walletData.id);
                if (txError) throw txError;
                setTransactions(txData || []);
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

        if (isNaN(amount) || amount < 2000) {
            addToast('Minimum deposit is ₦2,000', 'warning');
            return;
        }

        setIsProcessing(true);

        if (!wallet || !wallet.id) {
            addToast('Wallet not initialized yet. Please complete your profile or contact support.', 'error');
            setIsProcessing(false);
            return;
        }

        try {
            // 1. Create a pending transaction record
            const { data: tx, error: txError } = await createTransaction({
                wallet_id: wallet.id,
                user_id: currentUser.id,
                type: 'deposit',
                amount: amount,
                status: 'pending',
                description: 'Wallet Funding via Flutterwave'
            });

            if (txError) throw txError;

            // 2. Initialize Paystack
            initializePaystack({
                public_key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
                reference: `CD-TX-${tx.id}`,
                amount: amount,
                email: currentUser.email,
                metadata: {
                    user_id: currentUser.id,
                    tx_id: tx.id,
                    type: 'deposit'
                },
                onSuccess: async (response) => {
                    const { error: completeError } = await completeTransaction(
                        tx.id,
                        'success',
                        response.reference,
                        response
                    );

                    if (completeError) {
                        addToast('Payment successful but wallet update failed.', 'error');
                    } else {
                        addToast('Wallet funded successfully!', 'success');
                        loadWalletData();
                        setIsProcessing(false);
                    }
                },
                onCancel: () => {
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
        const type = 'swipe_earnings'; // Default for ladies

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

        setIsProcessing(true);
        try {
            const { error: withdrawalErr } = await supabase
                .from('withdrawals')
                .insert({
                    user_id: currentUser.id,
                    amount: amount,
                    type: type,
                    status: 'pending',
                    bank_details: { bank: 'User Bank', account: '1234567890' } // Placeholder
                });

            if (withdrawalErr) throw withdrawalErr;

            // Deduct from available, move to pending
            const { error: updateErr } = await supabase
                .from('wallets')
                .update({
                    available_balance: wallet.available_balance - amount,
                    pending_balance: (wallet.pending_balance || 0) + amount,
                    updated_at: new Date().toISOString()
                })
                .eq('id', wallet.id);

            if (updateErr) throw updateErr;

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

    const isLady = userProfile?.role === 'Female';

    return (
        <div className="wallet-page animated fadeIn">
            <div className="wallet-header">
                <h1>{isLady ? 'Earnings Dashboard' : 'My Wallet'}</h1>
                <p>{isLady ? 'Track your swipes and request payouts.' : 'Fund your wallet and keep swiping.'}</p>
                <a href="https://wa.me/2349160264415?text=Hi%20👋%20I%20need%20help%20with%20my%20wallet/payout"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="wallet-support-link">
                    Need help? Chat with Support
                </a>
            </div>

            <div className="payout-info-banner glass animate-fade-in">
                <div className="banner-content">
                    <span className="banner-icon">⏳</span>
                    <div className="banner-text">
                        <strong>Next Payout Cycle Starts in:</strong>
                        <span className="countdown-timer">{payoutCountdown}</span>
                    </div>
                </div>
                <div className="banner-badge">Weekly Every Friday</div>
            </div>

            <div className="wallet-overview-grid">
                <div className="balance-card">
                    <span className="balance-label">{isLady ? 'Available for Withdrawal' : 'Available Balance'}</span>
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

                    {!isLady ? (
                        <div className="wallet-actions">
                            <form onSubmit={handleFunding} className="funding-form">
                                <label className="form-label">Min ₦2,000</label>
                                <div className="input-group">
                                    <input
                                        type="number"
                                        placeholder="Amount"
                                        value={fundingAmount}
                                        onChange={(e) => setFundingAmount(e.target.value)}
                                        min="2000"
                                        className="funding-input"
                                        disabled={isProcessing}
                                    />
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
                                <label className="form-label">Min ₦15,000</label>
                                <div className="input-group">
                                    <input
                                        type="number"
                                        placeholder="Amount"
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
                        <span className="step-num">1</span>
                        <p>Earn <strong>₦15,000</strong> or more from swipes and gifts.</p>
                    </div>
                    <div className="step">
                        <span className="step-num">2</span>
                        <p>Request a withdrawal below to the payout queue.</p>
                    </div>
                    <div className="step">
                        <span className="step-num">3</span>
                        <p>Payments are processed every <strong>Friday at 12 PM</strong>.</p>
                    </div>
                </div>
            </div>

            <section className="payout-section">
                <h2 className="section-title">Payout Information</h2>
                <p className="section-subtitle">Where should we send your earnings?</p>

                <div className="payout-method-selector">
                    <button
                        type="button"
                        className={`method-btn ${payoutDetails.preferred_method === 'bank' ? 'active' : ''}`}
                        onClick={() => setPayoutDetails({ ...payoutDetails, preferred_method: 'bank' })}
                    >
                        🏦 Bank Account
                    </button>
                    <button
                        type="button"
                        className={`method-btn ${payoutDetails.preferred_method === 'paypal' ? 'active' : ''}`}
                        onClick={() => setPayoutDetails({ ...payoutDetails, preferred_method: 'paypal' })}
                    >
                        🅿️ PayPal
                    </button>
                </div>

                <form onSubmit={handleSavePayout} className="payout-form">
                    {payoutDetails.preferred_method === 'bank' ? (
                        <div className="payout-info-grid">
                            <div className="payout-form-group">
                                <label>Bank Name</label>
                                <input
                                    type="text"
                                    className="payout-input"
                                    placeholder="e.g. GTBank"
                                    value={payoutDetails.bank_name || ''}
                                    onChange={(e) => setPayoutDetails({ ...payoutDetails, bank_name: e.target.value })}
                                />
                            </div>
                            <div className="payout-form-group">
                                <label>Account Number</label>
                                <input
                                    type="text"
                                    className="payout-input"
                                    placeholder="0123456789"
                                    value={payoutDetails.account_number || ''}
                                    onChange={(e) => setPayoutDetails({ ...payoutDetails, account_number: e.target.value })}
                                />
                            </div>
                            <div className="payout-form-group" style={{ gridColumn: 'span 2' }}>
                                <label>Account Name</label>
                                <input
                                    type="text"
                                    className="payout-input"
                                    placeholder="Full name as seen on account"
                                    value={payoutDetails.account_name || ''}
                                    onChange={(e) => setPayoutDetails({ ...payoutDetails, account_name: e.target.value })}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="payout-form-group">
                            <label>PayPal Email</label>
                            <input
                                type="email"
                                className="payout-input"
                                placeholder="your@paypal.com"
                                value={payoutDetails.paypal_email || ''}
                                onChange={(e) => setPayoutDetails({ ...payoutDetails, paypal_email: e.target.value })}
                            />
                        </div>
                    )}

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
                                    {tx.type === 'deposit' ? '💰' : tx.type === 'swipe_reward' ? '⭐' : tx.type === 'swipe_purchase' ? '💸' : '🎁'}
                                </div>
                                <div className="tx-info">
                                    <span className="tx-type">{tx.type.replace('_', ' ').charAt(0).toUpperCase() + tx.type.replace('_', ' ').slice(1)}</span>
                                    <span className="tx-description">{tx.description}</span>
                                    <span className="tx-date">{new Date(tx.created_at).toLocaleDateString()}</span>
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
        </div >
    );
}
