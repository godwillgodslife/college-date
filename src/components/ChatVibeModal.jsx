import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import { sendChatVibe } from '../services/swipeService';
import { triggerLightHaptic } from '../utils/haptics';
import { getAvatarUrl } from '../utils/profileData';
import './ChatVibeModal.css';

export default function ChatVibeModal({ isOpen, targetProfile, onClose, onSuccess }) {
    const navigate = useNavigate();
    const { currentUser, walletBalance, fetchWallet } = useAuth();
    const { addToast } = useToast();
    const [sending, setSending] = useState(false);

    if (!isOpen || !targetProfile) return null;

    const balance = Number(walletBalance || 0);
    const requiredAmount = 500;
    const hasEnoughBalance = balance >= requiredAmount;

    const handleConfirmVibe = async () => {
        if (!currentUser?.id) {
            addToast('Please sign in to send a Chat Vibe.', 'info');
            return;
        }

        if (!hasEnoughBalance) {
            addToast(`Insufficient balance (₦${balance.toLocaleString()}). Please fund your wallet.`, 'warning');
            navigate('/wallet');
            onClose();
            return;
        }

        setSending(true);
        try {
            triggerLightHaptic?.();
            const { data, error } = await sendChatVibe(targetProfile.id);

            if (error || !data?.success) {
                const errMsg = error || data?.error || 'Failed to send Chat Vibe';
                addToast(errMsg, 'error');
                return;
            }

            // Refresh wallet balance in background
            fetchWallet?.(currentUser.id);

            addToast(`🎉 Chat Vibe sent! You are now connected with ${targetProfile.full_name || 'them'}.`, 'success');
            onClose();

            if (data.match_id) {
                if (onSuccess) onSuccess(data.match_id);
                navigate(`/chat?chatId=${data.match_id}`);
            }
        } catch (err) {
            console.error('[ChatVibeModal] error:', err);
            addToast('Failed to send Chat Vibe. Please try again.', 'error');
        } finally {
            setSending(false);
        }
    };

    const handleFundWallet = () => {
        onClose();
        navigate('/wallet');
    };

    const targetPhoto = getAvatarUrl(targetProfile) || targetProfile.profile_photos?.[0] || targetProfile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${targetProfile.id}`;

    return createPortal(
        <AnimatePresence>
            <div className="chat-vibe-modal-backdrop" onClick={onClose}>
                <motion.div
                    className="chat-vibe-modal-content"
                    initial={{ opacity: 0, scale: 0.92, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: 20 }}
                    transition={{ type: 'spring', damping: 24, stiffness: 260 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="chat-vibe-modal-header">
                        <div className="vibe-sparkle-pill">✨ Instant DM</div>
                        <button type="button" className="chat-vibe-close-btn" onClick={onClose} aria-label="Close">
                            ✕
                        </button>
                    </div>

                    <div className="chat-vibe-avatar-container">
                        <img src={targetPhoto} alt={targetProfile.full_name} className="chat-vibe-avatar" />
                        <span className="chat-vibe-badge">💬</span>
                    </div>

                    <h3 className="chat-vibe-title">
                        Send Chat Vibe to {targetProfile.full_name?.split(' ')[0] || 'Student'}
                    </h3>

                    <p className="chat-vibe-description">
                        Unlock instant direct messaging with {targetProfile.full_name || 'this student'} without waiting for a mutual swipe match.
                    </p>

                    <div className="chat-vibe-pricing-card">
                        <div className="vibe-price-row">
                            <span className="vibe-price-label">Chat Vibe Fee</span>
                            <span className="vibe-price-amount">₦500</span>
                        </div>
                        <div className="vibe-wallet-row">
                            <span className="vibe-wallet-label">Your Wallet Balance</span>
                            <span className={`vibe-wallet-balance ${hasEnoughBalance ? 'positive' : 'insufficient'}`}>
                                ₦{balance.toLocaleString()}
                            </span>
                        </div>
                        {!hasEnoughBalance && (
                            <div className="vibe-insufficient-alert">
                                ⚠️ You need ₦{(requiredAmount - balance).toLocaleString()} more to send a Chat Vibe.
                            </div>
                        )}
                    </div>

                    <div className="chat-vibe-actions">
                        {hasEnoughBalance ? (
                            <button
                                type="button"
                                className="btn-confirm-vibe"
                                onClick={handleConfirmVibe}
                                disabled={sending}
                            >
                                {sending ? (
                                    <>
                                        <span className="vibe-spinner">⏳</span>
                                        <span>Unlocking Conversation...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>✨ Send Vibe (₦500)</span>
                                    </>
                                )}
                            </button>
                        ) : (
                            <button
                                type="button"
                                className="btn-fund-wallet-vibe"
                                onClick={handleFundWallet}
                            >
                                💳 Fund Wallet to Chat
                            </button>
                        )}
                        <button
                            type="button"
                            className="btn-cancel-vibe"
                            onClick={onClose}
                            disabled={sending}
                        >
                            Cancel
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    );
}
