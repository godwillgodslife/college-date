import { useState } from 'react';
import './StickerDrawer.css';

const NIGERIAN_STICKERS = [
    { id: 'oversabi', emoji: '🧐', label: 'Oversabi' },
    { id: 'no-wahala', emoji: '😌', label: 'No Wahala' },
    { id: 'oshey', emoji: '🙌', label: 'Oshey!' },
    { id: 'chop-life', emoji: '🍗', label: 'Chop Life' },
    { id: 'mumu', emoji: '🤡', label: 'Mumu' },
    { id: 'jara', emoji: '➕', label: 'Jara' },
    { id: 'abeg', emoji: '🙏', label: 'Abeg' },
    { id: 'god-when', emoji: '🥺', label: 'God When?' },
];

export default function StickerDrawer({ onSelectSticker, onClose }) {
    const [activeTab, setActiveTab] = useState('stickers');

    return (
        <div className="sticker-drawer">
            <div className="drawer-header">
                <div className="drawer-tabs">
                    <button
                        className={activeTab === 'stickers' ? 'active' : ''}
                        onClick={() => setActiveTab('stickers')}
                    >
                        Stickers
                    </button>
                    <button
                        className={activeTab === 'emoji' ? 'active' : ''}
                        onClick={() => setActiveTab('emoji')}
                    >
                        Emojis
                    </button>
                </div>
                <button className="btn-close-drawer" onClick={onClose}>&times;</button>
            </div>

            <div className="drawer-content">
                {activeTab === 'stickers' ? (
                    <div className="sticker-grid">
                        {NIGERIAN_STICKERS.map(sticker => (
                            <div
                                key={sticker.id}
                                className="sticker-item"
                                onClick={() => onSelectSticker(sticker, 'sticker')}
                            >
                                <span className="sticker-emoji">{sticker.emoji}</span>
                                <span className="sticker-label">{sticker.label}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="emoji-grid">
                        {['❤️', '😂', '🔥', '🙌', '✨', '🥺', '😍', '😎', '💀', '💯', '🙏', '👍', '😢', '😡', '🤔', '👀'].map(emoji => (
                            <div
                                key={emoji}
                                className="emoji-item"
                                onClick={() => onSelectSticker(emoji, 'emoji')}
                            >
                                {emoji}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
