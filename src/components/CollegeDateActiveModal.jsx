import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useActiveProgram } from '../hooks/useActiveProgram';
import { useToast } from './Toast';
import './CollegeDateActiveModal.css';

export default function CollegeDateActiveModal({ isOpen, onClose, userId }) {
    const navigate = useNavigate();
    const { addToast } = useToast();
    const {
        enrolled,
        isEligible,
        accruedEarnings,
        monthlyTarget,
        dailyReward,
        qualifyingDaysCount,
        minQualifyingDays,
        remainingDaysNeeded,
        progressPercentage,
        todayQualified,
        todayProgress,
        giftsReceivedNgn,
        payoutDate,
        enroll,
        evaluateToday,
        isLoading
    } = useActiveProgram(userId);

    const [actionLoading, setActionLoading] = useState(false);

    if (!isOpen) return null;

    const handleEnroll = async () => {
        setActionLoading(true);
        try {
            const res = await enroll();
            if (res.success) {
                addToast('🎉 You are now enrolled in College Date Active!', 'success');
            } else {
                addToast(res.error || 'Could not enroll at this time.', 'error');
            }
        } catch (err) {
            addToast(err.message || 'Enrollment failed', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCheckToday = async () => {
        setActionLoading(true);
        try {
            const res = await evaluateToday();
            if (res?.data?.is_qualified) {
                addToast(`🌟 Awesome! Today's +₦${res.data.earned_today || dailyReward} qualified!`, 'success');
            } else {
                addToast('Activity recorded! Complete remaining items to qualify for today.', 'info');
            }
        } catch (err) {
            addToast(err.message || 'Check failed', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="active-program-overlay" onClick={onClose}>
                <motion.div
                    className="active-program-modal"
                    onClick={(e) => e.stopPropagation()}
                    initial={{ opacity: 0, scale: 0.92, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                >
                    {/* Header */}
                    <div className="active-modal-header">
                        <div className="active-brand-badge">
                            <span>⚡</span> College Date Active
                        </div>
                        <button className="active-close-btn" onClick={onClose}>✕</button>
                    </div>

                    {/* Content */}
                    <div className="active-modal-body">
                        {/* Earnings Hero */}
                        <div className="active-earnings-hero">
                            <div className="active-hero-label">Your Monthly Activity Earnings</div>
                            <div className="active-earnings-value">
                                ₦{accruedEarnings.toLocaleString()}
                            </div>
                            <div className="active-target-hint">
                                Target: <strong>₦{monthlyTarget.toLocaleString()}</strong> / month (+₦{dailyReward} / qualifying day)
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="active-progress-section">
                            <div className="active-progress-header">
                                <span>Monthly Progress</span>
                                <strong>{progressPercentage}%</strong>
                            </div>
                            <div className="active-progress-bar-bg">
                                <div
                                    className="active-progress-bar-fill"
                                    style={{ width: `${Math.min(100, Math.max(5, progressPercentage))}%` }}
                                />
                            </div>
                            <div className="active-days-counter">
                                <span>{qualifyingDaysCount} / {minQualifyingDays} days completed</span>
                                <span>{remainingDaysNeeded > 0 ? `${remainingDaysNeeded} days to target` : 'Target Achieved! 🎉'}</span>
                            </div>
                        </div>

                        {/* Today's Activity Checklist */}
                        <div className="active-checklist-card">
                            <div className="active-checklist-title">
                                <span>Today's Participation</span>
                                <span className={`active-status-badge ${todayQualified ? 'qualified' : 'in_progress'}`}>
                                    {todayQualified ? '✓ Qualified (+₦' + dailyReward + ')' : 'In Progress'}
                                </span>
                            </div>

                            {/* Item 1: Discovery Swipes */}
                            <div className="active-check-item">
                                <div className="active-check-label">
                                    <span className="active-check-icon">👆</span>
                                    <span>Discovery Swipes ({todayProgress?.swipes_count || 0}/{todayProgress?.required_swipes || 15})</span>
                                </div>
                                <span className={`active-check-pill ${todayProgress?.swipes_done ? 'done' : 'pending'}`}>
                                    {todayProgress?.swipes_done ? '✓ Done' : 'Pending'}
                                </span>
                            </div>

                            {/* Item 2: Conversation Responses */}
                            <div className="active-check-item">
                                <div className="active-check-label">
                                    <span className="active-check-icon">💬</span>
                                    <span>Chat Messages ({todayProgress?.chats_count || 0}/{todayProgress?.required_chats || 3})</span>
                                </div>
                                <span className={`active-check-pill ${todayProgress?.chats_done ? 'done' : 'pending'}`}>
                                    {todayProgress?.chats_done ? '✓ Done' : 'Pending'}
                                </span>
                            </div>

                            {/* Item 3: Score Streak */}
                            <div className="active-check-item">
                                <div className="active-check-label">
                                    <span className="active-check-icon">🔥</span>
                                    <span>Score Streak Activity</span>
                                </div>
                                <span className={`active-check-pill ${todayProgress?.streak_done ? 'done' : 'pending'}`}>
                                    {todayProgress?.streak_done ? '✓ Done' : 'Pending'}
                                </span>
                            </div>
                        </div>

                        {/* Extra Metrics (Separated Gifts) */}
                        <div className="active-extra-metrics">
                            <div className="active-mini-metric">
                                <div className="active-mini-title">🎁 Gifts Received</div>
                                <div className="active-mini-val">₦{giftsReceivedNgn.toLocaleString()}</div>
                            </div>
                            <div className="active-mini-metric">
                                <div className="active-mini-title">📅 Next Settlement</div>
                                <div className="active-mini-val">{payoutDate || '28th of month'}</div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="active-modal-footer">
                        {!enrolled ? (
                            <button
                                className="btn-active-primary"
                                onClick={handleEnroll}
                                disabled={actionLoading || !isEligible}
                            >
                                {actionLoading ? 'Enrolling...' : isEligible ? '🌟 Join College Date Active' : 'Exclusive to Female Ambassadors'}
                            </button>
                        ) : (
                            <button
                                className="btn-active-primary"
                                onClick={handleCheckToday}
                                disabled={actionLoading}
                            >
                                {actionLoading ? 'Evaluating...' : todayQualified ? '✓ Today Confirmed — Check In' : '⚡ Check Today\'s Qualification'}
                            </button>
                        )}

                        <button
                            className="btn-active-secondary"
                            onClick={() => {
                                onClose();
                                navigate('/wallet');
                            }}
                        >
                            Open Wallet & Earnings Ledger 👛
                        </button>

                        <div className="active-payout-note">
                            Earnings automatically settle into your College Date Wallet on the 28th (target: 24 qualifying days / ₦15,000). Withdraw to any Nigerian bank account.
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
