import { useState } from "react";
import "./StickerDrawer.css";

const NIGERIAN_STICKERS = [
    { id: "oversabi", emoji: "🧐", label: "Oversabi" },
    { id: "no-wahala", emoji: "😌", label: "No Wahala" },
    { id: "oshey", emoji: "🙌", label: "Oshey!" },
    { id: "chop-life", emoji: "🍗", label: "Chop Life" },
    { id: "mumu", emoji: "🤡", label: "Mumu" },
    { id: "jara", emoji: "➕", label: "Jara" },
    { id: "abeg", emoji: "🙏", label: "Abeg" },
    { id: "god-when", emoji: "🥺", label: "God When?" },
    { id: "carryover", emoji: "💀", label: "Carryover" },
    { id: "schoolfees", emoji: "💸", label: "School Fees" },
    { id: "library", emoji: "📚", label: "Library Run" },
    { id: "cafeteria", emoji: "🍔", label: "CAF Review" },
    { id: "period", emoji: "💃", label: "Free Period" },
    { id: "gp-up", emoji: "📈", label: "GPA Boost" },
];

const EMOJI_CATEGORIES = [
    { label: "😊 People", emojis: ["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😇","🥰","😍","🤩","😘","😚","😙","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","🤐","🤨","😐","😑","😶","😏","😒","🙄","😬","🤥","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🤧","🥵","🥶","🥴","😵","🤯","🤠","🥳","😎","🤓","🧐","😕","😟","🙁","☹️","😮","😯","😲","😳","🥺","😦","😧","😨","😰","😥","😢","😭","😱","😖","😣","😞","😓","😩","😫","🥱"] },
    { label: "❤️ Love", emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟","♥️","💋","💌","💍","💎","👫","👬","👭","🥂","🌹","🌷","💐","🎁","🎉","🎊","🪄","✨","💑","🫦","😻","🫀"] },
    { label: "🔥 Fun", emojis: ["🔥","💯","🎯","🎮","🕹️","🎲","🎭","🎨","🎤","🎧","🎵","🎶","🎸","🎹","🥁","🎷","🎺","🎻","🎬","📺","📷","📸","💻","🖥️","📱","🔔","💡","🔦","🕯️","🔑","🗝️","⚡","🌊","💥","🌪️","❄️","🌈","☀️","🌙","⭐","🌟","💫","✨","🎆","🎇","🧨","🪅","🎠","🎡","🎢"] },
    { label: "🌿 Nature", emojis: ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🙈","🙉","🙊","🐔","🐧","🐦","🦆","🦅","🦉","🦇","🐺","🦄","🐝","🦋","🌸","🌺","🌻","🌼","🌾","🍀","🌱","🌿","🍃","🍂","🍁","🌳","🌲","🎋","🪴","🌵","🌴","🍄","🪸","🌊","🏖️","🏝️","⛰️","🏔️"] },
    { label: "🍕 Food", emojis: ["🍎","🍊","🍋","🍇","🍓","🫐","🍈","🍒","🍑","🥭","🍍","🥥","🥝","🍅","🫒","🥑","🥦","🧄","🧅","🥔","🌽","🌶️","🥕","🍆","🍱","🍜","🍝","🍛","🍲","🍗","🍖","🌮","🌯","🧆","🧇","🥞","🧈","🍔","🍟","🍕","🌭","🥪","🍿","🧃","🥤","☕","🍵","🥛","🍷","🍸","🧁","🍰","🎂","🍩","🍪","🍫","🍬","🍭"] },
    { label: "📚 Campus", emojis: ["📚","📖","📝","✏️","🖊️","📌","📎","📏","🖇️","📐","🗂️","📋","📊","📈","📉","💼","🎒","🏫","🏛️","⏰","⌚","📅","📆","🗒️","📓","📔","📒","📕","📗","📘","📙","💡","🔭","🔬","⚗️","🧪","🧫","🧬","💊","🩺","🎓","🏆","🥇","🥈","🥉","🎖️","🏅","🎗️"] },
];

export default function StickerDrawer({ onSelectSticker, onClose }) {
    const [activeTab, setActiveTab] = useState("stickers");
    const [activeCategory, setActiveCategory] = useState(0);
    const [emojiSearch, setEmojiSearch] = useState("");

    const filteredEmojis = emojiSearch.trim()
        ? EMOJI_CATEGORIES.flatMap(c => c.emojis).filter(e => e.includes(emojiSearch))
        : EMOJI_CATEGORIES[activeCategory]?.emojis || [];

    return (
        <div className="sticker-drawer">
            <div className="drawer-header">
                <div className="drawer-tabs">
                    <button className={activeTab === "stickers" ? "active" : ""} onClick={() => setActiveTab("stickers")}>🇳🇬 Stickers</button>
                    <button className={activeTab === "emoji" ? "active" : ""} onClick={() => setActiveTab("emoji")}>😀 Emojis</button>
                </div>
                <button className="btn-close-drawer" onClick={onClose}>&times;</button>
            </div>
            <div className="drawer-content">
                {activeTab === "stickers" ? (
                    <div className="sticker-grid">
                        {NIGERIAN_STICKERS.map(sticker => (
                            <div key={sticker.id} className="sticker-item" onClick={() => onSelectSticker(sticker, "sticker")}>
                                <span className="sticker-emoji">{sticker.emoji}</span>
                                <span className="sticker-label">{sticker.label}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="emoji-keyboard">
                        <input type="text" className="emoji-search-input" placeholder="Search emojis..." value={emojiSearch} onChange={e => setEmojiSearch(e.target.value)} aria-label="Search emojis" />
                        {!emojiSearch && (
                            <div className="emoji-category-tabs">
                                {EMOJI_CATEGORIES.map((cat, idx) => (
                                    <button key={idx} className={`emoji-cat-btn ${activeCategory === idx ? "active" : ""}`} onClick={() => setActiveCategory(idx)} title={cat.label}>
                                        {cat.label.split(" ")[0]}
                                    </button>
                                ))}
                            </div>
                        )}
                        <div className="emoji-grid-full">
                            {filteredEmojis.map(emoji => (
                                <div key={emoji} className="emoji-item" onClick={() => onSelectSticker(emoji, "emoji")} role="button" tabIndex={0} aria-label={`Emoji ${emoji}`}>{emoji}</div>
                            ))}
                            {filteredEmojis.length === 0 && <p className="emoji-no-results">No emojis found 😅</p>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
