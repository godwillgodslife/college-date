import React, { useState } from 'react';
import './ProfileCompletion.css';

const ProfileCompletion = ({
    score,
    profile,
    onCompleteClick,
    onAiCoachClick,
    aiCoachLoading = false,
    aiCoachResult = null
}) => {
    const [showAiDetails, setShowAiDetails] = useState(false);
    const [dismissed, setDismissed] = useState(() => {
        if (typeof window === 'undefined' || !window.localStorage) return false;
        return window.localStorage.getItem('tcd_dismissed_profile_completion') === 'true';
    });

    // Scoring Logic (matching DB trigger)
    const checklist = [
        { label: 'Add clear photo', bonus: '+30%', done: Boolean(profile?.avatar_url || profile?.profile_photos?.[0]), value: 30 },
        { label: 'Add bio', bonus: '+20%', done: (profile?.bio?.trim().length || 0) >= 10, value: 20 },
        { label: '3+ Interests', bonus: '+15%', done: (profile?.interests?.length || 0) >= 3, value: 15 },
        { label: 'Short Intro Prompt', bonus: '+15%', done: (profile?.intro_prompt?.trim().length || 0) >= 5, value: 15 },
        { label: 'Campus Year', bonus: '+10%', done: Boolean(profile?.level), value: 10 },
        { label: 'Verify Email', bonus: '+10%', done: Boolean(profile?.email), value: 10 },
    ];

    const computedScore = checklist.reduce((acc, item) => item.done ? acc + item.value : acc, 0);
    const effectiveScore = Math.min(100, Math.max(computedScore, typeof score === 'number' && score > 0 ? score : 0));
    const isComplete = effectiveScore >= 100;
    const nextMissing = checklist.find(item => !item.done);

    const handleToggleCoach = (e) => {
        e.stopPropagation();
        if (!aiCoachResult && onAiCoachClick) {
            onAiCoachClick();
        }
        setShowAiDetails(prev => !prev);
    };

    if (dismissed) return null;

    return (
        <div className={`profile-completion-card ${isComplete ? 'is-complete' : ''}`}>
            <div className="completion-compact-main">
                <div className="completion-compact-header">
                    <span className="completion-compact-title">⚡ Profile Strength</span>
                    <span className="completion-percentage">{effectiveScore}%</span>
                </div>
                <div className="progress-bar-container">
                    <div
                        className="progress-bar-fill"
                        style={{ width: `${effectiveScore}%` }}
                    />
                </div>
                <div className="completion-sub-row">
                    {nextMissing && !isComplete ? (
                        <span className="completion-next-hint">
                            💡 Next: <strong>{nextMissing.label}</strong> ({nextMissing.bonus})
                        </span>
                    ) : (
                        <span className="completion-next-hint all-done">
                            ✨ Complete profile boosts discoverability by 3.5×
                        </span>
                    )}
                    {onAiCoachClick && (
                        <button
                            type="button"
                            className="btn-coach-inline-toggle"
                            onClick={handleToggleCoach}
                            disabled={aiCoachLoading}
                            title="Get AI tips to improve profile match appeal"
                        >
                            {aiCoachLoading ? 'Thinking...' : aiCoachResult ? (showAiDetails ? 'Hide Tips' : '🤖 AI Tips') : '🤖 AI Coach'}
                        </button>
                    )}
                </div>
            </div>

            <div className="completion-compact-action" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {!isComplete ? (
                    <button type="button" className="btn-optimize-compact" onClick={onCompleteClick}>
                        Finish Setup →
                    </button>
                ) : (
                    <span className="completion-reward-pill">
                        🔥 Optimised
                    </span>
                )}
                <button
                    type="button"
                    className="completion-dismiss-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        setDismissed(true);
                        try {
                            localStorage.setItem('tcd_dismissed_profile_completion', 'true');
                        } catch (_) {}
                    }}
                    title="Dismiss"
                    aria-label="Dismiss profile strength"
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted, #94a3b8)',
                        cursor: 'pointer',
                        padding: '4px',
                        fontSize: '1rem',
                        lineHeight: 1
                    }}
                >
                    ✕
                </button>
            </div>

            {/* EXPANDABLE AI COACH INSIGHT (nestled directly inside completion thread) */}
            {showAiDetails && aiCoachResult && (
                <div className="completion-ai-expanded-box">
                    <div className="completion-ai-inner">
                        {aiCoachResult.bio_suggestion && (
                            <p className="ai-coach-mini-bio">
                                <strong>💡 Bio Idea:</strong> {aiCoachResult.bio_suggestion}
                            </p>
                        )}
                        {aiCoachResult.summary && !aiCoachResult.bio_suggestion && (
                            <p className="ai-coach-mini-summary">{aiCoachResult.summary}</p>
                        )}
                        {aiCoachResult.priority_actions?.length > 0 && (
                            <div className="ai-coach-mini-actions">
                                {aiCoachResult.priority_actions.slice(0, 2).map((act) => (
                                    <span key={act} className="ai-coach-mini-chip">✓ {act}</span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfileCompletion;
