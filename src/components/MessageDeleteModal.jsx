import React from 'react';
import './MessageDeleteModal.css';

export default function MessageDeleteModal({
    message,
    isSentByMe,
    onDeleteForMe,
    onDeleteForEveryone,
    onClose
}) {
    if (!message) return null;

    const isSeen = Boolean(
        message.is_read ||
        message.seen_at ||
        message.read_at ||
        message.metadata?.seen_at ||
        message.metadata?.read_at
    );

    // Only author can delete for everyone, and strictly ONLY if recipient has NOT seen it
    const canDeleteForEveryone = isSentByMe && !isSeen && message.type !== 'deleted';

    return (
        <div
            className="msg-delete-overlay"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="msg-delete-title"
        >
            <div className="msg-delete-card">
                <div className="msg-delete-icon-ring">🗑️</div>
                <h3 id="msg-delete-title" className="msg-delete-title">Delete Message?</h3>

                <p className="msg-delete-subtitle">
                    {canDeleteForEveryone
                        ? 'Choose whether to delete this message for everyone or only for yourself.'
                        : (isSentByMe && isSeen)
                            ? 'This message has already been seen by the recipient.'
                            : 'This message will be removed from your chat history.'}
                </p>

                {isSentByMe && isSeen && (
                    <div className="msg-delete-seen-notice">
                        <span>👁️</span>
                        <span>Seen messages can only be deleted for you.</span>
                    </div>
                )}

                <div className="msg-delete-actions">
                    {canDeleteForEveryone && (
                        <button
                            type="button"
                            className="btn-msg-delete everyone"
                            onClick={() => {
                                onDeleteForEveryone(message);
                                onClose();
                            }}
                        >
                            Delete for everyone
                        </button>
                    )}

                    <button
                        type="button"
                        className="btn-msg-delete me"
                        onClick={() => {
                            onDeleteForMe(message);
                            onClose();
                        }}
                    >
                        Delete for me
                    </button>

                    <button
                        type="button"
                        className="btn-msg-delete cancel"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
