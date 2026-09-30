import { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';
import './Toast.css';

const ToastContext = createContext(null);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

// Priority Weights
const PRIORITY_LEVELS = {
    HIGH: 3,    // Matches, Security alerts, Fatal System Errors
    MEDIUM: 2,  // Super Swipes, Inbound Messages, Level Ups
    LOW: 1      // Routine tips, minor informational feedback
};

function inferPriority(type, message, options = {}) {
    if (options.priority) {
        const p = String(options.priority).toUpperCase();
        if (PRIORITY_LEVELS[p]) return PRIORITY_LEVELS[p];
    }
    const msgLower = String(message || '').toLowerCase();
    if (type === 'error' || msgLower.includes('match') || msgLower.includes('security') || msgLower.includes('blocked')) {
        return PRIORITY_LEVELS.HIGH;
    }
    if (msgLower.includes('super swipe') || msgLower.includes('message') || type === 'warning') {
        return PRIORITY_LEVELS.MEDIUM;
    }
    return PRIORITY_LEVELS.LOW;
}

const MAX_QUEUE_SIZE = 3;
const DEDUPE_WINDOW_MS = 3000;

export function ToastProvider({ children }) {
    // activeToast is strictly singular — only ONE primary toast is visible at any given time
    const [activeToast, setActiveToast] = useState(null);
    const [isExiting, setIsExiting] = useState(false);

    // Queue of pending toasts (sorted by priority desc, then timestamp asc)
    const queueRef = useRef([]);
    const recentMessagesRef = useRef(new Map());
    const exitTimerRef = useRef(null);
    const durationTimerRef = useRef(null);

    // Process next toast from the queue
    const processQueue = useCallback(() => {
        if (activeToast || queueRef.current.length === 0) return;

        // Sort: highest priority first, then earliest created
        queueRef.current.sort((a, b) => {
            if (b.priority !== a.priority) return b.priority - a.priority;
            return a.timestamp - b.timestamp;
        });

        const next = queueRef.current.shift();
        if (!next) return;

        setIsExiting(false);
        setActiveToast(next);

        // Schedule duration
        if (durationTimerRef.current) clearTimeout(durationTimerRef.current);
        durationTimerRef.current = setTimeout(() => {
            dismissActiveToast();
        }, next.duration);
    }, [activeToast]);

    const dismissActiveToast = useCallback(() => {
        if (durationTimerRef.current) clearTimeout(durationTimerRef.current);
        setIsExiting(true);

        if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
        exitTimerRef.current = setTimeout(() => {
            setActiveToast(null);
            setIsExiting(false);
        }, 280); // match CSS exit animation duration
    }, []);

    // When activeToast becomes null, immediately pick the next one
    useEffect(() => {
        if (!activeToast) {
            processQueue();
        }
    }, [activeToast, processQueue]);

    const addToast = useCallback((message, type = 'info', duration = 3500, options = {}) => {
        if (!message) return;

        const now = Date.now();
        const normKey = `${type}:${String(message).trim().toLowerCase()}`;

        // 1. DEDUPLICATION: Suppress identical toasts within the rolling dedupe window
        const lastSeen = recentMessagesRef.current.get(normKey);
        if (lastSeen && (now - lastSeen) < DEDUPE_WINDOW_MS) {
            return;
        }
        recentMessagesRef.current.set(normKey, now);

        // Clean up old dedupe map entries
        if (recentMessagesRef.current.size > 25) {
            for (const [k, ts] of recentMessagesRef.current.entries()) {
                if (now - ts > DEDUPE_WINDOW_MS) recentMessagesRef.current.delete(k);
            }
        }

        const priority = inferPriority(type, message, options);

        // 2. COALESCING: If a HIGH priority event comes in and current active is LOW, preempt it
        if (priority === PRIORITY_LEVELS.HIGH && activeToast && activeToast.priority < PRIORITY_LEVELS.HIGH) {
            dismissActiveToast();
        }

        // 3. QUEUE MANAGEMENT: Prevent infinite queue overflow
        if (queueRef.current.length >= MAX_QUEUE_SIZE) {
            // Drop lowest priority or oldest item
            const lowestIdx = queueRef.current.findIndex(item => item.priority === PRIORITY_LEVELS.LOW);
            if (lowestIdx !== -1) {
                queueRef.current.splice(lowestIdx, 1);
            } else {
                queueRef.current.shift(); // drop oldest
            }
        }

        const newToast = {
            id: now + Math.random(),
            message,
            type,
            duration,
            priority,
            timestamp: now,
            ...options
        };

        // If no toast is active, show immediately
        if (!activeToast) {
            setIsExiting(false);
            setActiveToast(newToast);

            if (durationTimerRef.current) clearTimeout(durationTimerRef.current);
            durationTimerRef.current = setTimeout(() => {
                dismissActiveToast();
            }, duration);
        } else {
            queueRef.current.push(newToast);
        }
    }, [activeToast, dismissActiveToast]);

    const success = useCallback((msg, opts) => addToast(msg, 'success', 3200, opts), [addToast]);
    const error = useCallback((msg, opts) => addToast(msg, 'error', 4500, { priority: 'HIGH', ...opts }), [addToast]);
    const info = useCallback((msg, opts) => addToast(msg, 'info', 3200, opts), [addToast]);
    const warning = useCallback((msg, opts) => addToast(msg, 'warning', 3800, { priority: 'MEDIUM', ...opts }), [addToast]);

    const icons = {
        success: '✓',
        error: '!',
        warning: '⚠',
        info: 'ℹ',
    };

    return (
        <ToastContext.Provider value={{ addToast, success, error, info, warning }}>
            {children}
            <div className="toast-container" role="alert" aria-live="polite">
                {activeToast && (
                    <div
                        key={activeToast.id}
                        className={`toast toast-${activeToast.type} ${activeToast.variant === 'notification' ? 'toast-notification' : ''} ${isExiting ? 'toast-exit' : ''} ${activeToast.onClick ? 'toast-clickable' : ''}`}
                        onClick={() => {
                            if (activeToast.onClick) {
                                activeToast.onClick();
                            }
                            dismissActiveToast();
                        }}
                    >
                        <span className="toast-icon">{activeToast.icon || icons[activeToast.type] || 'ℹ'}</span>
                        {activeToast.variant === 'notification' ? (
                            <span className="toast-notification-copy">
                                <span className="toast-notification-topline">
                                    <span className="toast-notification-title">{activeToast.title || activeToast.message}</span>
                                    <span className="toast-notification-time">now</span>
                                </span>
                                {activeToast.body && <span className="toast-notification-body">{activeToast.body}</span>}
                                <span className="toast-notification-meta">{activeToast.meta || 'Tap to open'}</span>
                            </span>
                        ) : (
                            <span className="toast-message">{activeToast.message}</span>
                        )}
                        <button
                            className="toast-close"
                            onClick={(e) => {
                                e.stopPropagation();
                                dismissActiveToast();
                            }}
                            aria-label="Dismiss notification"
                        >
                            ✕
                        </button>
                    </div>
                )}
            </div>
        </ToastContext.Provider>
    );
}
