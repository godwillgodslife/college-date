import './MessageReactionBar.css';

const REACTIONS = ['❤️', '😂', '🔥', '😮', '😢'];

export default function MessageReactionBar({ onReact, onClose, position }) {
    return (
        <>
            {/* Invisible backdrop to dismiss */}
            <div className="reaction-bar-backdrop" onClick={onClose} />

            <div
                className="reaction-bar"
                style={{ top: position.y, left: position.x }}
            >
                {REACTIONS.map(emoji => (
                    <button
                        key={emoji}
                        className="reaction-btn"
                        onClick={() => {
                            onReact(emoji);
                            onClose();
                        }}
                    >
                        {emoji}
                    </button>
                ))}
            </div>
        </>
    );
}

