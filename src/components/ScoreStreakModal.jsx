import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import './ScoreStreakModal.css';

export default function ScoreStreakModal({ 
    isOpen, 
    onClose, 
    streak = 0, 
    longestStreak = 0, 
    activeToday = false, 
    nextMilestone = 7, 
    progressToMilestone = 0, 
    onStartActivity 
}) {
    // Suppress bottom navigation bar and background scroll while modal is active
    useEffect(() => {
        if (!isOpen) return;
        document.body.classList.add('has-modal-open');
        return () => {
            document.body.classList.remove('has-modal-open');
        };
    }, [isOpen]);

    // Handle Escape key dismissal
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const milestones = [
        { days: 7, label: 'Campus Spark ✨', perk: '1 Free Super Swipe 💌' },
        { days: 14, label: 'Chemistry Starter 💫', perk: '30-Min Spotlight Boost 🚀' },
        { days: 30, label: 'Campus Connector 🌟', perk: 'Gold VIP Frame + 50 Coins 👑' },
        { days: 60, label: 'Campus Icon 👑', perk: 'Campus Icon + 100 Coins ⭐' },
        { days: 100, label: 'College Legend 🏆', perk: 'Hall of Fame Legend Trophy 🏆' }
    ];

    // Find highest achieved milestone badge
    const currentMilestoneBadge = [...milestones].reverse().find(m => streak >= m.days) || null;
    const clampedProgress = Math.min(100, Math.max(0, Math.round(progressToMilestone || 0)));

    const modalMarkup = (
        <div 
            className="score-streak-modal-backdrop" 
            onClick={onClose} 
            role="dialog" 
            aria-modal="true"
            aria-labelledby="score-streak-title"
        >
            <div className="score-streak-modal-container" onClick={(e) => e.stopPropagation()}>
                <div className="score-streak-modal-header">
                    <div className="score-streak-title-wrapper">
                        <span aria-hidden="true">🔥</span>
                        <h2 id="score-streak-title">Score Streak</h2>
                    </div>
                    <button 
                        type="button" 
                        className="score-streak-close-btn" 
                        onClick={onClose}
                        aria-label="Close streak modal"
                    >
                        &times;
                    </button>
                </div>

                <div className="score-streak-modal-body">
                    {/* Compact Hero Section */}
                    <div className="score-streak-hero">
                        <div className="score-streak-flame-circle" aria-hidden="true">
                            <span className="score-streak-flame-emoji">🔥</span>
                        </div>
                        <div className="score-streak-days-count">
                            {streak} {streak === 1 ? 'Day' : 'Days'}
                        </div>
                        {currentMilestoneBadge ? (
                            <div className="score-streak-badge-pill">
                                {currentMilestoneBadge.label}
                            </div>
                        ) : (
                            <p className="score-streak-subhead">Keep your commitment going strong.</p>
                        )}
                    </div>

                    {/* Integrated Status & Record Strip */}
                    <div className="score-streak-metrics-strip">
                        <div className={`score-streak-status-pill ${activeToday ? 'active' : 'at-risk'}`}>
                            {activeToday ? (
                                <>
                                    <span>✓</span>
                                    <span>Active Today</span>
                                </>
                            ) : (
                                <>
                                    <span>⏳</span>
                                    <span>Action Needed</span>
                                </>
                            )}
                        </div>
                        <div className="score-streak-best-pill">
                            <span>🏆</span>
                            <span>Best: {longestStreak}d</span>
                        </div>
                    </div>

                    {/* Milestone Progress Bar */}
                    <div className="score-streak-milestone-section">
                        <div className="score-streak-milestone-header">
                            <span>Next: {nextMilestone ? `${nextMilestone} Days` : 'Max Tier'}</span>
                            <span>{clampedProgress}%</span>
                        </div>
                        <div 
                            className="score-streak-progress-bar-bg" 
                            role="progressbar" 
                            aria-valuenow={clampedProgress} 
                            aria-valuemin="0" 
                            aria-valuemax="100"
                        >
                            <div 
                                className="score-streak-progress-bar-fill" 
                                style={{ width: `${clampedProgress}%` }}
                            />
                        </div>
                        <div className="score-streak-perk-hint">
                            🎁 Unlocks: <strong>{milestones.find(m => m.days > streak)?.perk || 'All Milestone Rewards Unlocked! 🏆'}</strong>
                        </div>
                    </div>

                    {/* Compact 2x2 Daily Action Chips */}
                    <div className="score-streak-activities-container">
                        <div className="score-streak-activities-title">1 Action Keeps Streak Alive</div>
                        <div className="score-streak-actions-grid">
                            <div className="score-streak-action-chip">
                                <span>⚡</span>
                                <span>Match Swipe</span>
                            </div>
                            <div className="score-streak-action-chip">
                                <span>💬</span>
                                <span>Chat Message</span>
                            </div>
                            <div className="score-streak-action-chip">
                                <span>💌</span>
                                <span>Send Request</span>
                            </div>
                            <div className="score-streak-action-chip">
                                <span>🎭</span>
                                <span>Post / React</span>
                            </div>
                        </div>
                    </div>

                    {/* CTA Button */}
                    <button 
                        type="button" 
                        className="score-streak-action-btn"
                        onClick={() => {
                            onClose();
                            if (onStartActivity) onStartActivity();
                        }}
                    >
                        {activeToday ? 'Keep Vibing 🔥' : 'Complete Today’s Activity ⚡'}
                    </button>
                </div>
            </div>
        </div>
    );

    return typeof document !== 'undefined' ? createPortal(modalMarkup, document.body) : modalMarkup;
}
