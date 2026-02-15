import { useState } from 'react';
import './GiftStore.css';

const GIFTS = [
    { id: 'rose', name: 'Digital Rose', emoji: '🌹', price: 200, color: '#f43f5e' },
    { id: 'zobo', name: 'Cold Zobo', emoji: '🍷', price: 200, color: '#9d174d' },
    { id: 'suya', name: 'Hot Suya', emoji: '🍢', price: 500, color: '#ea580c' },
    { id: 'credit', name: 'Airtime', emoji: '📱', price: 1000, color: '#2563eb' },
];

export default function GiftStore({ onSend, onClose, balance = 0 }) {
    const [selectedGift, setSelectedGift] = useState(null);

    const handlePurchase = () => {
        if (!selectedGift) return;
        if (balance < selectedGift.price) {
            alert('Insufficient balance. Please fund your wallet.');
            return;
        }
        onSend(selectedGift);
    };

    return (
        <div className="gift-store-overlay">
            <div className="gift-store-modal">
                <div className="gift-store-header">
                    <h3>Icebreaker Store</h3>
                    <div className="wallet-pill">Balance: ₦{balance}</div>
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
                            <span className="gift-price">₦{gift.price}</span>
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
                        Send {selectedGift ? selectedGift.name : 'Gift'}
                    </button>
                </div>
            </div>
        </div>
    );
}
