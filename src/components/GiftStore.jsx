import { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import './GiftStore.css';

const GIFTS = [
    { id: 'rose', name: 'Digital Rose', emoji: '🌹', price: 200, color: '#f43f5e' },
    { id: 'zubo', name: 'Cold Zobo', emoji: '🍷', price: 200, color: '#9d174d' },
    { id: 'suya', name: 'Hot Suya', emoji: '🍢', price: 500, color: '#ea580c' },
    { id: 'airtime', name: 'Airtime', emoji: '📱', price: 1000, color: '#2563eb' },
    { id: 'l_time', name: 'L-Time', emoji: '⌛', price: 5000, color: '#ffd700' },
];

export default function GiftStore({ onSend, onClose, balance = 0 }) {
    const [selectedGift, setSelectedGift] = useState(null);
    const [isConfirming, setIsConfirming] = useState(false);
    const navigate = useNavigate(); // Hook for navigation

    const handlePurchase = () => {
        console.log('🎁 Purchase attempt:', selectedGift);
        if (!selectedGift) return;

        if (balance < selectedGift.price) {
            console.log('🎁 Insufficient balance:', balance, '<', selectedGift.price);
            const confirmed = window.confirm('Insufficient wallet balance. Go to Add Funds?');
            if (confirmed) {
                onClose(); // Close modal first
                navigate('/wallet'); // Redirect to Wallet/Add Funds
            }
            return;
        }

        // Show custom confirmation instead of window.confirm
        setIsConfirming(true);
    };

    const confirmSend = () => {
        console.log('🎁 [GiftStore.jsx] confirmSend() triggered. Calling onSend...');
        setIsConfirming(false); // Reset confirmation state immediately 
        onSend(selectedGift);
    };

    return (
        <div className="gift-store-overlay">
            <div className="gift-store-modal">
                <div className="gift-store-header">
                    <h3>Icebreaker Store</h3>
                    <div className={`wallet-pill ${balance < 200 ? 'low-balance' : ''}`}>
                        Balance: ₦{balance.toLocaleString()}
                    </div>
                    <button className="btn-close" onClick={onClose}>&times;</button>
                </div>

                <div className="gift-grid">
                    {GIFTS.map(gift => (
                        <div
                            key={gift.id}
                            className={`gift-card ${selectedGift?.id === gift.id ? 'active' : ''}`}
                            onClick={() => {
                                console.log('🎁 Card clicked:', gift.name, gift.id);
                                setSelectedGift(gift);
                            }}
                            style={{ '--gift-color': gift.color }}
                        >
                            <span className="gift-emoji" style={{ pointerEvents: 'none' }}>{gift.emoji}</span>
                            <span className="gift-name" style={{ pointerEvents: 'none' }}>{gift.name}</span>
                            <span className="gift-price" style={{ pointerEvents: 'none' }}>₦{gift.price.toLocaleString()}</span>
                        </div>
                    ))}
                </div>

                <div className="gift-footer">
                    {isConfirming ? (
                        <div className="confirm-purchase-area">
                            <p className="confirm-text">Confirm sending <strong>{selectedGift.name}</strong> for <strong>₦{selectedGift.price.toLocaleString()}</strong>?</p>
                            <div className="confirm-btns">
                                <button className="btn-cancel-buy" onClick={() => setIsConfirming(false)}>Cancel</button>
                                <button className="btn-confirm-buy" onClick={confirmSend}>Yes, Send!</button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <p className="gift-hint">Gifts appear with a special animation in the chat!</p>
                            <button
                                className="btn-buy"
                                disabled={!selectedGift}
                                onClick={handlePurchase}
                            >
                                {selectedGift ? `Send for ₦${selectedGift.price.toLocaleString()}` : 'Select a Gift'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
