import React from 'react';
import './ProfileCompletion.css';

const ProfileCompletion = ({ score, profile, onCompleteClick }) => {
    // Scoring Logic (matching DB trigger)
    const checklist = [
        { label: 'Add clear photo', bonus: '+30%', done: !!profile?.avatar_url, value: 30 },
        { label: 'Add bio', bonus: '+20%', done: (profile?.bio?.length || 0) >= 10, value: 20 },
        { label: '3+ Interests', bonus: '+15%', done: (profile?.interests?.length || 0) >= 3, value: 15 },
        { label: 'Short Intro Prompt', bonus: '+15%', done: (profile?.intro_prompt?.length || 0) >= 5, value: 15 },
        { label: 'Campus Year', bonus: '+10%', done: !!profile?.level, value: 10 },
        { label: 'Verify Email', bonus: '+10%', done: !!profile?.email, value: 10 },
    ];

    const isComplete = score === 100;

    return (
        <div className={`profile-completion-card ${isComplete ? 'is-complete' : ''}`}>
            <div className="completion-header">
                <div className="completion-title-row">
                    <h3>Profile Strength</h3>
                    <span className="completion-percentage">{score}%</span>
                </div>
                <div className="progress-bar-container">
                    <div
                        className="progress-bar-fill"
                        style={{ width: `${score}%` }}
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
