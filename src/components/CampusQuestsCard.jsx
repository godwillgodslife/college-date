import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    getDailyQuests, 
    isAllQuestsCompleted, 
    claimDailyQuestBonus, 
    isDailyQuestBonusClaimed,
    DAILY_QUESTS_COMPLETION_BONUS_COINS 
} from '../services/campusQuestService';
import { triggerLightHaptic, triggerSuccessHaptic } from '../services/haptics';
import { useToast } from './Toast';
import './CampusQuestsCard.css';

export default function CampusQuestsCard({ userId }) {
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [quests, setQuests] = useState(() => getDailyQuests(userId));
    const [claimed, setClaimed] = useState(() => isDailyQuestBonusClaimed(userId));

    const refreshQuests = useCallback(() => {
        setQuests(getDailyQuests(userId));
        setClaimed(isDailyQuestBonusClaimed(userId));
    }, [userId]);

    useEffect(() => {
        refreshQuests();
        const handleUpdate = () => refreshQuests();
        window.addEventListener('cd:quests-updated', handleUpdate);
        window.addEventListener('cd:quests-claimed', handleUpdate);
        return () => {
            window.removeEventListener('cd:quests-updated', handleUpdate);
            window.removeEventListener('cd:quests-claimed', handleUpdate);
        };
    }, [refreshQuests]);

    const allCompleted = isAllQuestsCompleted(quests);
    const completedCount = quests.filter(q => q.completed).length;

    const handleClaim = () => {
        const success = claimDailyQuestBonus(userId);
        if (success) {
            triggerSuccessHaptic();
            setClaimed(true);
            if (addToast) {
                addToast(`🎉 25 Bonus Coins Claimed! Daily Champion badge active ⚡`, 'success');
            }
        }
    };

    const handleActionClick = (route) => {
        triggerLightHaptic();
        navigate(route);
    };

    return (
        <section className="campus-quests-card" aria-label="Daily Campus Quests">
            <div className="campus-quests-header">
                <div className="campus-quests-title-row">
                    <span className="campus-quests-icon" aria-hidden="true">🎯</span>
                    <div>
                        <h3 className="campus-quests-title">Campus Daily Quests</h3>
                        <p className="campus-quests-subhead">
                            {allCompleted 
                                ? 'All missions completed for today!' 
                                : `${completedCount} of ${quests.length} completed • Reset at midnight`}
                        </p>
                    </div>
                </div>
                <div className="campus-quests-reward-badge">
                    +{DAILY_QUESTS_COMPLETION_BONUS_COINS} Coins 💰
                </div>
            </div>

            <div className="campus-quests-list">
                {quests.map((quest) => {
                    const progressPct = Math.round((quest.progress / quest.target) * 100);

                    return (
                        <div 
                            key={quest.id} 
                            className={`campus-quest-item ${quest.completed ? 'is-completed' : ''}`}
                        >
                            <div className="campus-quest-left">
                                <span className="campus-quest-type-icon">{quest.icon}</span>
                                <div className="campus-quest-details">
                                    <div className="campus-quest-name-row">
                                        <span className="campus-quest-name">{quest.title}</span>
                                        <span className="campus-quest-xp">+{quest.xp} XP</span>
                                    </div>
                                    <p className="campus-quest-desc">{quest.description}</p>
                                    
                                    <div className="campus-quest-progress-track">
                                        <div 
                                            className="campus-quest-progress-fill" 
                                            style={{ width: `${progressPct}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="campus-quest-right">
                                {quest.completed ? (
                                    <div className="campus-quest-check-pill">
                                        <span>✓ Done</span>
                                    </div>
                                ) : (
                                    <button 
                                        type="button" 
                                        className="campus-quest-action-btn"
                                        onClick={() => handleActionClick(quest.route)}
                                        aria-label={`${quest.actionLabel} to complete ${quest.title}`}
                                    >
                                        {quest.actionLabel} →
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {allCompleted && (
                <div className="campus-quests-footer">
                    {claimed ? (
                        <div className="campus-quests-claimed-badge">
                            <span>👑 Daily Champion Active • +25 Coins Received</span>
                        </div>
                    ) : (
                        <button 
                            type="button" 
                            className="campus-quests-claim-btn"
                            onClick={handleClaim}
                        >
                            🎉 Claim +25 Bonus Coins
                        </button>
                    )}
                </div>
            )}
        </section>
    );
}
