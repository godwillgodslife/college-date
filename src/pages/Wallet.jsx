import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
    getWallet,
    getTransactions,
    createTransaction,
    completeTransaction,
    initializeFlutterwave
} from '../services/paymentService';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
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

    useEffect(() => {
        if (currentUser) {
            loadWalletData();
        }
    }, [currentUser]);

    async function loadWalletData() {
        setLoading(true);
        try {
            const { data: walletData, error: walletError } = await getWallet(currentUser.id);
            if (walletError) throw walletError;
            setWallet(walletData);

            if (walletData) {
                const { data: txData, error: txError } = await getTransactions(walletData.id);
                if (txError) throw txError;
                setTransactions(txData || []);
            }
        } catch (err) {
            console.error('Error loading wallet data:', err);
            addToast('Failed to load wallet information', 'error');
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

            // 2. Initialize Flutterwave
            initializeFlutterwave({
                public_key: import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY,
                tx_ref: `CD-TX-${tx.id}`,
                amount: amount,
                currency: 'NGN',
                customer: {
                    email: currentUser.email,
                    phone_number: userProfile?.phone || '',
                    name: userProfile?.full_name || 'College Date User',
                },
                callback: async (response) => {
                    if (response.status === "successful") {
                        const { error: completeError } = await completeTransaction(
                            tx.id,
                            'success',
                            response.transaction_id.toString()
                        );
                        if (completeError) {
                            addToast('Payment successful but wallet update failed. Please contact support.', 'error');
                        } else {
                            addToast('Wallet funded successfully!', 'success');
                            loadWalletData();
                        }
                    } else {
                        await completeTransaction(tx.id, 'failed', response.transaction_id?.toString());
                        addToast('Payment failed', 'error');
                    }
                },
                onclose: () => {
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

    if (loading) return <LoadingSpinner fullScreen />;

    const isLady = userProfile?.role === 'Female';

    return (
        <div className="wallet-page animated fadeIn">
            <div className="wallet-header">
                <h1>{isLady ? 'Earnings Dashboard' : 'My Wallet'}</h1>
                <p>{isLady ? 'Track your swipes and request payouts.' : 'Fund your wallet and keep swiping.'}</p>
            </div>

            <div className="wallet-overview-grid">
                <div className="balance-card">
                    <span className="balance-label">{isLady ? 'Available for Withdrawal' : 'Available Balance'}</span>
                    <h2 className="balance-amount">
                        ₦{parseFloat(wallet?.available_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </h2>

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
            </div>

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
        </div>
    );
}
