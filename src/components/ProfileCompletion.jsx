import React from 'react';
import './ProfileCompletion.css';

const ProfileCompletion = ({ score, profile, onCompleteClick }) => {
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

    return (
        <div className={`profile-completion-card ${isComplete ? 'is-complete' : ''}`}>
            <div className="completion-header">
                <div className="completion-title-row">
                    <h3>Profile Strength</h3>
                    <span className="completion-percentage">{effectiveScore}%</span>
                </div>
                <div className="progress-bar-container">
                    <div
                        className="progress-bar-fill"
                        style={{ width: `${effectiveScore}%` }}
                    />
                </div>
            </div>

            {!isComplete && (
                <div className="completion-checklist">
                    {checklist.filter(item => !item.done).slice(0, 2).map((item, index) => (
                        <div key={index} className="checklist-item">
                            <span className="item-label">{item.label}</span>
                            <span className="item-bonus">{item.bonus}</span>
                        </div>
                    ))}
                    <button className="btn-optimize-nudge" onClick={onCompleteClick}>
                        Finish Setup →
                    </button>
                </div>
            )}

            {isComplete && (
                <div className="completion-reward-badge">
                    <span className="badge-icon">🔥</span>
                    <span className="badge-text">Profile Optimised</span>
                </div>
            )}
        </div>
    );
};

export default ProfileCompletion;
