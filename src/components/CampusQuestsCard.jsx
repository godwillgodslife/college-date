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
import { createNotification } from '../services/notificationService';
import { useToast } from './Toast';
import './CampusQuestsCard.css';

function getShortActionLabel(label) {
    if (!label) return 'Go →';
    if (label.includes('Swipe')) return 'Swipe →';
    if (label.includes('Chat') || label.includes('Message')) return 'Chat →';
    if (label.includes('Confess')) return 'Post →';
    return `${label.split(' ')[0]} →`;
}

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

            // Write celebratory entry to Notification Center & trigger push
            if (userId) {
                const todayKey = new Date().toISOString().split('T')[0];
                createNotification({
                    userId,
                    type: 'quest_reward',
                    category: 'account',
                    title: 'Daily Quests Champion! 🎯',
                    content: `You completed all 3 campus quests today and claimed +${DAILY_QUESTS_COMPLETION_BONUS_COINS} Bonus Coins!`,
                    deepLink: '/dashboard',
                    priority: 'normal',
                    dedupeKey: `quest_bonus:${userId}:${todayKey}`,
                    metadata: {
                        event: 'quest_reward',
                        bonus_coins: DAILY_QUESTS_COMPLETION_BONUS_COINS,
                        url: '/dashboard'
                    }
                }).catch(err => console.warn('[CampusQuestsCard] Notification error:', err));
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
                                : `${completedCount}/${quests.length} done • Resets midnight`}
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
                                        <span className="quest-btn-label-mobile">{getShortActionLabel(quest.actionLabel)}</span>
                                        <span className="quest-btn-label-desktop">{quest.actionLabel} →</span>
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
