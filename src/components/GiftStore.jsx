import { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import './GiftStore.css';

const GIFTS = [
    { id: 'digital_rules', name: 'Digital Rules', emoji: '📜', price: 200, color: '#64748b' },
    { id: 'code', name: 'Code', emoji: '💻', price: 500, color: '#22c55e' },
    { id: 'zubo', name: 'Zubo', emoji: '🍷', price: 500, color: '#9d174d' },
    { id: 'hotsuya', name: 'Hotsuya', emoji: '🍢', price: 1000, color: '#ea580c' },
    { id: 'l_time', name: 'L-time', emoji: '⌛', price: 5000, color: '#ffd700' },
];

export default function GiftStore({ onSend, onClose, balance = 0 }) {
    const [selectedGift, setSelectedGift] = useState(null);
    const navigate = useNavigate(); // Hook for navigation

    const handlePurchase = () => {
        if (!selectedGift) return;

        if (balance < selectedGift.price) {
            const confirmed = window.confirm('Insufficient wallet balance. Go to Add Funds?');
            if (confirmed) {
                onClose(); // Close modal first
                navigate('/wallet'); // Redirect to Wallet/Add Funds
            }
            return;
        }

        const confirmed = window.confirm(`Send ${selectedGift.name} for ₦${selectedGift.price}?`);
        if (confirmed) {
            onSend(selectedGift);
        }
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
                            onClick={() => setSelectedGift(gift)}
                            style={{ '--gift-color': gift.color }}
                        >
                            <span className="gift-emoji">{gift.emoji}</span>
                            <span className="gift-name">{gift.name}</span>
                            <span className="gift-price">₦{gift.price.toLocaleString()}</span>
                        </div>
                    ))}
                </div>

                <div className="gift-footer">
                    <p className="gift-hint">Gifts appear with a special animation in the chat!</p>
                    <button
                        className="btn-buy"
                        disabled={!selectedGift}
                        onClick={handlePurchase}
                    >
                        {selectedGift ? `Send for ₦${selectedGift.price.toLocaleString()}` : 'Select a Gift'}
                    </button>
                </div>
            </div>
        </div>
    );
}
