import { useState, useEffect } from 'react';
import { COIN_PACKAGES, purchaseCoinsWithWallet, getCoinTransactions } from '../services/coinService';
import { useToast } from './Toast';
import './CoinStoreModal.css';

export default function CoinStoreModal({ userCoins = 0, walletBalance = 0, onClose, onCoinsUpdated }) {
    const [selectedPackage, setSelectedPackage] = useState(COIN_PACKAGES[1]); // Default to popular
    const [isPurchasing, setIsPurchasing] = useState(false);
    const [activeTab, setActiveTab] = useState('buy'); // 'buy' | 'history'
    const [transactions, setTransactions] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        if (activeTab === 'history') {
            loadHistory();
        }
    }, [activeTab]);

    const loadHistory = async () => {
        setLoadingHistory(true);
        try {
            // Fetch coin transactions from backend
            const { transactions: txList } = await getCoinTransactions();
            setTransactions(txList || []);
        } catch (err) {
            console.error('Failed to load coin history:', err);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleBuyWithWallet = async () => {
        if (!selectedPackage) return;
        if (walletBalance < selectedPackage.priceNgn) {
            addToast(`Insufficient wallet balance (₦${walletBalance.toLocaleString()}). Top up wallet first.`, 'error');
            return;
        }

        setIsPurchasing(true);
        try {
            const res = await purchaseCoinsWithWallet(selectedPackage.id);
            if (!res.success) throw new Error(res.error);

            addToast(`🎉 Successfully added ${res.coinsAdded} CD Coins!`, 'success');
            if (onCoinsUpdated) onCoinsUpdated(res.newCoinBalance);
            onClose();
        } catch (err) {
            console.error('Coin purchase error:', err);
            addToast(err.message || 'Failed to purchase coins', 'error');
        } finally {
            setIsPurchasing(false);
        }
    };

    return (
        <div className="coin-store-overlay">
            <div className="coin-store-modal">
                <div className="coin-store-header">
                    <div className="coin-header-main">
                        <div className="coin-brand-pill">
                            <span className="coin-icon">🪙</span>
                            <span className="coin-title">CD Coins</span>
                        </div>
                        <div className="user-coin-balance-pill">
                            <span>Balance:</span>
                            <strong>🪙 {userCoins.toLocaleString()}</strong>
                        </div>
                    </div>
                    <button type="button" className="btn-close-coin-store" onClick={onClose}>&times;</button>
                </div>

                <div className="coin-store-tabs">
                    <button
                        type="button"
                        className={`tab-btn ${activeTab === 'buy' ? 'active' : ''}`}
                        onClick={() => setActiveTab('buy')}
                    >
                        Buy Coins
                    </button>
                    <button
                        type="button"
                        className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
                        onClick={() => setActiveTab('history')}
                    >
                        Transaction History
                    </button>
                </div>

                {activeTab === 'buy' ? (
                    <div className="coin-store-body">
                        <p className="coin-store-tagline">
                            Use CD Coins to send interactive virtual gifts and celebrate campus connections.
                        </p>

                        <div className="coin-packages-grid">
                            {COIN_PACKAGES.map((pkg) => (
                                <div
                                    key={pkg.id}
                                    className={`coin-package-card ${selectedPackage?.id === pkg.id ? 'selected' : ''} ${pkg.popular ? 'popular' : ''}`}
                                    onClick={() => setSelectedPackage(pkg)}
                                >
                                    {pkg.popular && <div className="package-ribbon">⭐ Most Popular</div>}
                                    <div className="pkg-coin-count">
                                        <span className="pkg-coin-icon">🪙</span>
                                        <strong>{pkg.totalCoins.toLocaleString()}</strong>
                                    </div>
                                    {pkg.bonus > 0 ? (
                                        <span className="pkg-bonus-tag">Includes +{pkg.bonus} Bonus!</span>
                                    ) : (
                                        <span className="pkg-standard-tag">{pkg.badge}</span>
                                    )}
                                    <div className="pkg-price-badge">₦{pkg.priceNgn.toLocaleString()}</div>
                                </div>
                            ))}
                        </div>

                        <div className="coin-purchase-footer">
                            <div className="wallet-balance-indicator">
                                <span>Available Wallet: <strong>₦{walletBalance.toLocaleString()}</strong></span>
                            </div>

                            <button
                                type="button"
                                className="btn-purchase-coins"
                                onClick={handleBuyWithWallet}
                                disabled={isPurchasing || !selectedPackage}
                            >
                                {isPurchasing
                                    ? 'Securing Coins...'
                                    : `Buy ${selectedPackage.totalCoins} Coins for ₦${selectedPackage.priceNgn.toLocaleString()}`}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="coin-history-body">
                        {loadingHistory ? (
                            <div className="coin-history-loading">Loading transactions...</div>
                        ) : transactions.length === 0 ? (
                            <div className="coin-history-empty">
                                <span>📜</span>
                                <p>No coin transactions yet. Buy coins or send gifts to see activity!</p>
                            </div>
                        ) : (
                            <div className="coin-history-list">
                                {transactions.map((tx) => (
                                    <div key={tx.id} className="coin-tx-item">
                                        <div className="tx-icon">
                                            {tx.amount > 0 ? '➕' : '🎁'}
                                        </div>
                                        <div className="tx-details">
                                            <span className="tx-type">
                                                {tx.transaction_type === 'purchase'
                                                    ? 'Coin Purchase'
                                                    : tx.transaction_type === 'gift_sent'
                                                    ? 'Gift Sent'
                                                    : tx.transaction_type === 'gift_received'
                                                    ? 'Gift Received'
                                                    : tx.transaction_type}
                                            </span>
                                            <span className="tx-date">
                                                {new Date(tx.created_at).toLocaleDateString([], {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </span>
                                        </div>
                                        <div className={`tx-amount ${tx.amount > 0 ? 'positive' : 'negative'}`}>
                                            {tx.amount > 0 ? `+${tx.amount}` : tx.amount} 🪙
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
