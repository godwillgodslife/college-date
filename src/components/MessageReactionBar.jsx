import './MessageReactionBar.css';

const REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🙏'];

export default function MessageReactionBar({ onReact, onClose, position }) {
    // Safe clamped position calculation
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 380;
    const barEstimatedWidth = 270;
    const safeLeft = Math.max(12, Math.min(position?.x ?? 20, screenWidth - barEstimatedWidth - 12));
    const safeTop = Math.max(70, position?.y ?? 100);

    return (
        <>
            {/* Invisible dismiss backdrop */}
            <div 
                className="reaction-bar-backdrop" 
                onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                }}
                onTouchStart={(e) => {
                    e.stopPropagation();
                    onClose();
                }}
            />

            <div
                className="reaction-bar"
                style={{ top: safeTop, left: safeLeft }}
                role="dialog"
                aria-label="Message Reactions"
                onClick={(e) => e.stopPropagation()}
            >
                {REACTIONS.map(emoji => (
                    <button
                        key={emoji}
                        type="button"
                        className="reaction-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            onReact(emoji);
                            onClose();
                        }}
                        aria-label={`React with ${emoji}`}
                    >
                        {emoji}
                    </button>
                ))}
            </div>
        </>
    );
}

