import React from 'react';
import './ScoreStreakModal.css';

export default function ScoreStreakModal({ isOpen, onClose, streak, longestStreak, activeToday, nextMilestone, progressToMilestone, onStartActivity }) {
    if (!isOpen) return null;

    const milestones = [
        { days: 7, label: 'Campus Spark ✨' },
        { days: 14, label: 'Chemistry Starter 💫' },
        { days: 30, label: 'Campus Connector 🌟' },
        { days: 60, label: 'Campus Icon 👑' },
        { days: 100, label: 'College Legend 🏆' }
    ];

    const currentMilestoneBadge = milestones.find(m => streak >= m.days) || null;

    return (
        <div className="score-streak-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
            <div className="score-streak-modal-container" onClick={(e) => e.stopPropagation()}>
                <div className="score-streak-modal-header">
                    <div className="score-streak-title-wrapper">
                        <span>🔥</span>
                        <h2>Score Streak</h2>
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
                    <div className="score-streak-hero">
                        <div className="score-streak-flame-circle">
                            <span className="score-streak-flame-emoji">🔥</span>
                        </div>
                        <div className="score-streak-days-count">{streak} {streak === 1 ? 'Day' : 'Days'}</div>
                        <p className="score-streak-subhead">
                            {currentMilestoneBadge ? currentMilestoneBadge.label : 'Keep your commitment going strong.'}
                        </p>

                        <div className={`score-streak-status-pill ${activeToday ? 'active' : 'at-risk'}`}>
                            {activeToday ? (
                                <>
                                    <span>✓</span>
                                    <span>Streak Active Today!</span>
                                </>
                            ) : (
                                <>
                                    <span>⏳</span>
                                    <span>Streak at Risk — Complete an action today</span>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="score-streak-stats-row">
                        <div className="score-streak-stat-box">
                            <div className="score-streak-stat-label">Current Streak</div>
                            <div className="score-streak-stat-val">🔥 {streak}d</div>
                        </div>
                        <div className="score-streak-stat-box">
                            <div className="score-streak-stat-label">Personal Best</div>
                            <div className="score-streak-stat-val">🏆 {longestStreak}d</div>
                        </div>
                    </div>

                    <div className="score-streak-milestone-section">
                        <div className="score-streak-milestone-header">
                            <span>Next Milestone: {nextMilestone} Days</span>
                            <span>{Math.min(100, Math.max(0, progressToMilestone))}%</span>
                        </div>
                        <div className="score-streak-progress-bar-bg">
                            <div 
                                className="score-streak-progress-bar-fill" 
                                style={{ width: `${Math.min(100, Math.max(0, progressToMilestone))}%` }}
                            />
                        </div>
                    </div>

                    <div className="score-streak-activities-list">
                        <div className="score-streak-activities-title">Qualifying Daily Actions</div>
                        <div className="score-streak-activity-item">
                            <span className="icon">⚡</span>
                            <span>Swipe on Match discovery cards</span>
                        </div>
                        <div className="score-streak-activity-item">
                            <span className="icon">💬</span>
                            <span>Send a chat message to a match</span>
                        </div>
                        <div className="score-streak-activity-item">
                            <span className="icon">💌</span>
                            <span>Send a connection request</span>
                        </div>
                        <div className="score-streak-activity-item">
                            <span className="icon">🎭</span>
                            <span>Post or react to a campus confession</span>
                        </div>
                    </div>

                    <button 
                        type="button" 
                        className="score-streak-action-btn"
                        onClick={() => {
                            onClose();
                            if (onStartActivity) onStartActivity();
                        }}
                    >
                        {activeToday ? 'Keep Vibing' : 'Complete Today’s Activity'}
                    </button>
                </div>
            </div>
        </div>
    );
}
