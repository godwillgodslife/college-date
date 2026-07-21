import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import './Toast.css';

const ToastContext = createContext(null);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info', duration = 4000, options = {}) => {
        const id = Date.now() + Math.random();
        setToasts((prev) => [...prev, { id, message, type, duration, ...options }]);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const success = useCallback((msg) => addToast(msg, 'success'), [addToast]);
    const error = useCallback((msg) => addToast(msg, 'error', 6000), [addToast]);
    const info = useCallback((msg) => addToast(msg, 'info'), [addToast]);
    const warning = useCallback((msg) => addToast(msg, 'warning'), [addToast]);

    return (
        <ToastContext.Provider value={{ addToast, success, error, info, warning }}>
            {children}
            <div className="toast-container" role="alert" aria-live="polite">
                {toasts.map((toast) => (
                    <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

function ToastItem({ toast, onRemove }) {
    const [exiting, setExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setExiting(true);
            setTimeout(() => onRemove(toast.id), 300);
        }, toast.duration);

        return () => clearTimeout(timer);
    }, [toast, onRemove]);

    const icons = {
        success: 'OK',
        error: '!',
        warning: '!',
        info: 'i',
    };
    const isNotification = toast.variant === 'notification';

    return (
        <div
            className={`toast toast-${toast.type} ${isNotification ? 'toast-notification' : ''} ${exiting ? 'toast-exit' : ''} ${toast.onClick ? 'toast-clickable' : ''}`}
            onClick={() => {
                if (toast.onClick) {
                    toast.onClick();
                    setExiting(true);
                    setTimeout(() => onRemove(toast.id), 300);
                }
            }}
        >
            <span className="toast-icon">{toast.icon || icons[toast.type]}</span>
            {isNotification ? (
                <span className="toast-notification-copy">
                    <span className="toast-notification-topline">
                        <span className="toast-notification-title">{toast.title || toast.message}</span>
                        <span className="toast-notification-time">now</span>
                    </span>
                    {toast.body && <span className="toast-notification-body">{toast.body}</span>}
                    <span className="toast-notification-meta">{toast.meta || 'Tap to open'}</span>
                </span>
            ) : (
                <span className="toast-message">{toast.message}</span>
            )}
            <button
                className="toast-close"
                onClick={(e) => {
                    e.stopPropagation();
                    setExiting(true);
                    setTimeout(() => onRemove(toast.id), 300);
                }}
                aria-label="Dismiss notification"
            >
                x
            </button>
        </div>
    );
}
