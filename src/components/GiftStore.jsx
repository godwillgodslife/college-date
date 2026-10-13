import { useState } from 'react';
import { createPortal } from 'react-dom';
import { VIRTUAL_GIFTS } from '../services/coinService';
import './GiftStore.css';

export default function GiftStore({ onSend, onClose, coinBalance = 0, onOpenCoinStore }) {
    const [selectedGift, setSelectedGift] = useState(null);
    const [isConfirming, setIsConfirming] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredGifts = VIRTUAL_GIFTS.filter(gift => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        return gift.name.toLowerCase().includes(q) ||
            (gift.desc && gift.desc.toLowerCase().includes(q)) ||
            gift.emoji.includes(q);
    });

    const handlePurchase = () => {
        if (!selectedGift) return;

        if (coinBalance < selectedGift.coins) {
            if (onOpenCoinStore) {
                onClose();
                onOpenCoinStore();
            } else {
                alert('Insufficient CD Coins. Please recharge your coin balance.');
            }
            return;
        }

        setIsConfirming(true);
    };

    const confirmSend = async () => {
        if (isSending) return;
        setIsConfirming(false);
        setIsSending(true);
        try {
            const success = await onSend(selectedGift);
            if (success) {
                setShowSuccess(true);
                setTimeout(() => {
                    onClose();
                }, 1800);
            }
        } finally {
            setIsSending(false);
        }
    };

    const modalContent = (
        <div className="gift-store-overlay" onClick={onClose}>
            <div className="gift-store-modal" onClick={e => e.stopPropagation()}>
                <div className="gift-store-header">
                    <div className="gift-header-title">
                        <span className="gift-store-icon">🎁</span>
                        <h3>Campus Gift Store</h3>
                    </div>
                    <div className="gift-header-actions">
                        <div
                            className={`coin-balance-pill ${coinBalance < 20 ? 'low-coins' : ''}`}
                            onClick={() => {
                                if (onOpenCoinStore) {
                                    onClose();
                                    onOpenCoinStore();
                                }
                            }}
                            title="Get more CD Coins"
                        >
                            🪙 {coinBalance.toLocaleString()} Coins <span>＋</span>
                        </div>
                        <button type="button" className="btn-close" onClick={onClose}>&times;</button>
                    </div>
                </div>

                <div className="gift-search-wrap">
                    <span className="gift-search-icon">🔍</span>
                    <input
                        type="search"
                        className="gift-search-input"
                        placeholder="Search campus gifts (e.g. Rose, Zobo, Suya)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        aria-label="Search campus gifts"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            className="gift-search-clear"
                            onClick={() => setSearchQuery('')}
                            aria-label="Clear search"
                        >
                            ✕
                        </button>
                    )}
                </div>

                {filteredGifts.length === 0 ? (
                    <div className="gift-empty-state">
                        <span className="gift-empty-icon">🎁</span>
                        <p className="gift-empty-title">No gifts found for "{searchQuery}"</p>
                        <p className="gift-empty-subtitle">Try searching for "rose", "zobo", "suya", or "lion"</p>
                    </div>
                ) : (
                    <div className="gift-grid">
                        {filteredGifts.map(gift => (
                            <div
                                key={gift.id}
                                className={`gift-card ${selectedGift?.id === gift.id ? 'active' : ''}`}
                                onClick={() => setSelectedGift(gift)}
                                style={{ '--gift-color': gift.color }}
                            >
                                <span className="gift-emoji">{gift.emoji}</span>
                                <span className="gift-name">{gift.name}</span>
                                <span className="gift-price">🪙 {gift.coins} Coins</span>
                            </div>
                        ))}
                    </div>
                )}

                <div className="gift-footer">
                    {showSuccess ? (
                        <div className="success-celebration">
                            <div className="success-icon">✨🎁✨</div>
                            <p className="success-text">Gift Sent Successfully!</p>
                        </div>
                    ) : isSending ? (
                        <div className="confirm-purchase-area">
                            <p className="confirm-text">Sending <strong>{selectedGift?.name}</strong>...</p>
                            <button type="button" className="btn-buy" disabled>Processing...</button>
                        </div>
                    ) : isConfirming ? (
                        <div className="confirm-purchase-area">
                            <p className="confirm-text">
                                Confirm sending <strong>{selectedGift?.name}</strong> for <strong>🪙 {selectedGift?.coins} Coins</strong>?
                            </p>
                            <div className="confirm-btns">
                                <button type="button" className="btn-cancel-buy" onClick={() => setIsConfirming(false)}>Cancel</button>
                                <button type="button" className="btn-confirm-buy" onClick={confirmSend}>Yes, Send!</button>
                            </div>
                        </div>
                    ) : (
                        <div className="purchase-cta-area">
                            <p className="gift-hint">Gifts appear instantly with a celebratory animation in chat!</p>
                            <button
                                type="button"
                                className="btn-buy"
                                disabled={!selectedGift}
                                onClick={handlePurchase}
                            >
                                {selectedGift
                                    ? coinBalance < selectedGift.coins
                                        ? `Need ${selectedGift.coins - coinBalance} More Coins (Get Coins)`
                                        : `Send for 🪙 ${selectedGift.coins} Coins`
                                    : 'Select a Gift'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    if (typeof document !== 'undefined' && document.body) {
        return createPortal(modalContent, document.body);
    }
    return modalContent;
}
