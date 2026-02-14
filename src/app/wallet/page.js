'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import BottomNav from '@/components/BottomNav';

export default function WalletPage() {
    const router = useRouter();
    const supabase = createClient();
    const { user, profile, loading: authLoading } = useAuth();
    const [wallet, setWallet] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [showWithdraw, setShowWithdraw] = useState(false);
    const [loading, setLoading] = useState(true);
    const [withdrawing, setWithdrawing] = useState(false);
    const [toast, setToast] = useState(null);
    const [withdrawForm, setWithdrawForm] = useState({
        amount: '',
        bank_name: '',
        account_number: '',
        account_name: '',
    });

    useEffect(() => {
        if (!authLoading && user && profile) {
            loadWallet();
        }
    }, [authLoading, user, profile]);

    const loadWallet = async () => {
        if (!user || !profile) return;

        if (profile.gender !== 'female') {
            router.push('/discover');
            return;
        }

        try {
            const { data: walletData } = await supabase
                .from('wallets')
                .select('*')
                .eq('user_id', user.id)
                .single();

            setWallet(walletData);

            const { data: txns } = await supabase
                .from('transactions')
                .select('*')
                .eq('recipient_id', user.id)
                .order('created_at', { ascending: false })
                .limit(20);

            setTransactions(txns || []);
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleWithdraw = async (e) => {
        e.preventDefault();
        if (parseFloat(withdrawForm.amount) > wallet.balance) {
            setToast({ message: 'Insufficient balance', type: 'error' });
            setTimeout(() => setToast(null), 3000);
            return;
        }

        setWithdrawing(true);
        try {
            await supabase.from('withdrawal_requests').insert({
                user_id: user.id,
                amount: parseFloat(withdrawForm.amount),
                bank_name: withdrawForm.bank_name,
                account_number: withdrawForm.account_number,
                account_name: withdrawForm.account_name,
            });

            setToast({ message: 'Withdrawal request submitted! 🎉', type: 'success' });
            setTimeout(() => setToast(null), 3000);
            setShowWithdraw(false);
            setWithdrawForm({ amount: '', bank_name: '', account_number: '', account_name: '' });
        } catch (err) {
            setToast({ message: 'Error: ' + err.message, type: 'error' });
            setTimeout(() => setToast(null), 3000);
        } finally {
            setWithdrawing(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 0,
        }).format(amount || 0);
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-NG', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (authLoading || (loading && !wallet)) {
        return (
            <div className="loading-screen" style={{
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)'
            }}>
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className="page">
            <div className="container">
                <div className="page-header">
                    <h1 className="page-title">Wallet</h1>
                </div>

                {/* Wallet Card */}
                <div className="wallet-card">
                    <div className="wallet-label">Available Balance</div>
                    <div className="wallet-balance">{formatCurrency(wallet?.balance)}</div>
                    <div className="wallet-stats">
                        <div className="wallet-stat">
                            <div className="wallet-stat-value">{formatCurrency(wallet?.total_earned)}</div>
                            Total Earned
                        </div>
                        <div className="wallet-stat">
                            <div className="wallet-stat-value">{formatCurrency(wallet?.total_withdrawn)}</div>
                            Withdrawn
                        </div>
                    </div>
                </div>

                <button
                    className="btn btn-success btn-full btn-lg"
                    style={{ margin: '20px 0' }}
                    onClick={() => setShowWithdraw(true)}
                    disabled={!wallet?.balance || wallet.balance <= 0}
                >
                    💸 Withdraw Funds
                </button>

                {/* Transaction History */}
                <h3 style={{ fontWeight: 600, marginBottom: '12px', fontSize: '1.1rem' }}>
                    Recent Earnings
                </h3>

                {transactions.length === 0 ? (
                    <div className="empty-state" style={{ padding: '40px 0' }}>
                        <div className="empty-state-icon">💰</div>
                        <p className="empty-state-desc">No earnings yet. When someone swipes on your profile, you&apos;ll earn ₦250!</p>
                    </div>
                ) : (
                    <div>
                        {transactions.map((tx) => (
                            <div key={tx.id} className="transaction-item">
                                <div className={`transaction-icon ${tx.type === 'swipe_payment' ? 'credit' : 'debit'}`}>
                                    {tx.type === 'swipe_payment' ? '💕' : '💸'}
                                </div>
                                <div className="transaction-info">
                                    <div className="transaction-title">
                                        {tx.type === 'swipe_payment' ? 'Swipe earning' : 'Withdrawal'}
                                    </div>
                                    <div className="transaction-date">{formatDate(tx.created_at)}</div>
                                </div>
                                <div className={`transaction-amount ${tx.type === 'swipe_payment' ? 'credit' : 'debit'}`}>
                                    {tx.type === 'swipe_payment' ? '+' : '-'}{formatCurrency(tx.recipient_earning || tx.amount)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Withdraw Modal */}
            {showWithdraw && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3 className="modal-title">💸 Withdraw Funds</h3>
                        <p className="modal-desc">
                            Available: {formatCurrency(wallet?.balance)}
                        </p>
                        <form onSubmit={handleWithdraw}>
                            <div className="form-group">
                                <label className="form-label">Amount (₦)</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    placeholder="e.g. 1000"
                                    value={withdrawForm.amount}
                                    onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                                    max={wallet?.balance}
                                    min={100}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Bank Name</label>
                                <select
                                    className="form-select"
                                    value={withdrawForm.bank_name}
                                    onChange={(e) => setWithdrawForm({ ...withdrawForm, bank_name: e.target.value })}
                                    required
                                >
                                    <option value="">Select bank</option>
                                    <option value="Access Bank">Access Bank</option>
                                    <option value="GTBank">GTBank</option>
                                    <option value="First Bank">First Bank</option>
                                    <option value="UBA">UBA</option>
                                    <option value="Zenith Bank">Zenith Bank</option>
                                    <option value="Kuda Bank">Kuda Bank</option>
                                    <option value="OPay">OPay</option>
                                    <option value="PalmPay">PalmPay</option>
                                    <option value="Wema Bank">Wema Bank</option>
                                    <option value="Fidelity Bank">Fidelity Bank</option>
                                    <option value="Sterling Bank">Sterling Bank</option>
                                    <option value="Union Bank">Union Bank</option>
                                    <option value="Stanbic IBTC">Stanbic IBTC</option>
                                    <option value="Polaris Bank">Polaris Bank</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Account Number</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="0123456789"
                                    maxLength={10}
                                    value={withdrawForm.account_number}
                                    onChange={(e) => setWithdrawForm({ ...withdrawForm, account_number: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Account Name</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Your account name"
                                    value={withdrawForm.account_name}
                                    onChange={(e) => setWithdrawForm({ ...withdrawForm, account_name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="modal-actions" style={{ flexDirection: 'column' }}>
                                <button type="submit" className="btn btn-success btn-full" disabled={withdrawing}>
                                    {withdrawing ? 'Submitting...' : 'Request Withdrawal'}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-full"
                                    onClick={() => setShowWithdraw(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {toast && (
                <div className={`toast toast-${toast.type}`}>
                    <span className="toast-message">{toast.message}</span>
                </div>
            )}

            <BottomNav gender={profile?.gender} />
        </div>
    );
}
