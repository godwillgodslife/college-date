import React, { useState, useEffect } from 'react';
import { triggerLightHaptic, triggerSuccessHaptic } from '../utils/haptics';
import { recordQuestProgress } from '../services/campusQuestService';
import { createNotification } from '../services/notificationService';
import './ChatMiniGameCard.css';

export default function ChatMiniGameCard({
    message,
    currentUserId,
    currentUserName = null,
    partnerName = 'your match',
    isSender = false
}) {
    const metadata = message?.metadata || {};
    const gameType = metadata.game_type || 'would_you_rather';
    const storageKey = `tcd_game_${message?.id || 'temp'}`;

    // Load persisted state for this specific game message
    const [gameState, setGameState] = useState(() => {
        if (typeof window === 'undefined' || !window.localStorage) return {};
        try {
            const saved = window.localStorage.getItem(storageKey);
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });

    const persistState = (updater) => {
        setGameState((prev) => {
            const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
            try {
                if (typeof window !== 'undefined' && window.localStorage) {
                    window.localStorage.setItem(storageKey, JSON.stringify(next));
                }
            } catch (err) {
                console.warn('Failed to persist game state:', err);
            }
            return next;
        });
    };

    // ─────────────────────────────────────────────────────────────
    // Game 1: Would You Rather
    // ─────────────────────────────────────────────────────────────
    const handleWyrVote = (choice) => {
        if (gameState.wyrVote) return; // already voted
        triggerLightHaptic();

        // Award XP for playing
        recordQuestProgress(currentUserId, 'quest_icebreaker', 1);

        persistState({
            wyrVote: choice,
            votedAt: Date.now()
        });

        // Notify partner that match answered their Would You Rather
        if (!isSender && message?.sender_id && currentUserId) {
            const optionA = metadata.option_a || 'Option A';
            const optionB = metadata.option_b || 'Option B';
            const choiceText = choice === 'A' ? optionA : optionB;
            const studentDisplayName = currentUserName || 'Your match';
            const matchId = message.match_id;

            createNotification({
                userId: message.sender_id,
                actorId: currentUserId,
                type: 'mini_game_response',
                category: 'messages',
                title: `${studentDisplayName} answered your Would You Rather! 🤔`,
                content: `${studentDisplayName} chose: "${choiceText}"`,
                conversationId: matchId,
                matchId: matchId,
                deepLink: matchId ? `/chat?chatId=${matchId}` : '/chat',
                priority: 'high',
                metadata: {
                    game_type: 'would_you_rather',
                    choice,
                    choice_text: choiceText,
                    message_id: message.id,
                    match_id: matchId,
                    actor_name: studentDisplayName,
                    url: matchId ? `/chat?chatId=${matchId}` : '/chat'
                }
            }).catch(err => console.warn('[ChatMiniGameCard] Notification error:', err));
        }
    };

    // ─────────────────────────────────────────────────────────────
    // Game 2: 2 Truths & a Lie
    // ─────────────────────────────────────────────────────────────
    const handleGuessLie = (guessIndex) => {
        if (gameState.guessIndex !== undefined) return; // already guessed
        const isCorrect = guessIndex === metadata.lie_index;

        if (isCorrect) {
            triggerSuccessHaptic();
            // Reward 15 XP for finding lie
            recordQuestProgress(currentUserId, 'quest_icebreaker', 1);
        } else {
            triggerLightHaptic();
            recordQuestProgress(currentUserId, 'quest_icebreaker', 1);
        }

        persistState({
            guessIndex,
            isCorrect,
            revealed: true,
            guessedAt: Date.now()
        });

        // Notify partner that match guessed their lie
        if (!isSender && message?.sender_id && currentUserId) {
            const studentDisplayName = currentUserName || 'Your match';
            const matchId = message.match_id;

            createNotification({
                userId: message.sender_id,
                actorId: currentUserId,
                type: 'mini_game_response',
                category: 'messages',
                title: isCorrect 
                    ? `🎯 ${studentDisplayName} spotted your lie!` 
                    : `😈 ${studentDisplayName} fell for your lie!`,
                content: isCorrect
                    ? `${studentDisplayName} correctly guessed statement #${guessIndex + 1} was the lie!`
                    : `${studentDisplayName} guessed wrong! They thought statement #${guessIndex + 1} was the lie.`,
                conversationId: matchId,
                matchId: matchId,
                deepLink: matchId ? `/chat?chatId=${matchId}` : '/chat',
                priority: 'high',
                metadata: {
                    game_type: 'two_truths_lie',
                    guess_index: guessIndex,
                    is_correct: isCorrect,
                    message_id: message.id,
                    match_id: matchId,
                    actor_name: studentDisplayName,
                    url: matchId ? `/chat?chatId=${matchId}` : '/chat'
                }
            }).catch(err => console.warn('[ChatMiniGameCard] Notification error:', err));
        }
    };

    if (gameType === 'would_you_rather') {
        const optionA = metadata.option_a || 'Option A';
        const optionB = metadata.option_b || 'Option B';
        const myVote = gameState.wyrVote;

        return (
            <div className="chat-mini-game-bubble wyr-bubble">
                <div className="game-bubble-header">
                    <span className="game-tag">🤔 Campus Would You Rather</span>
                    {myVote && <span className="game-xp-pill">+10 XP</span>}
                </div>

                <p className="game-bubble-title">Pick your stance:</p>

                <div className="game-wyr-options">
                    <button
                        type="button"
                        className={`game-wyr-btn btn-opt-a ${myVote === 'A' ? 'selected' : ''}`}
                        onClick={() => handleWyrVote('A')}
                    >
                        <span className="opt-letter">A</span>
                        <span className="opt-text">{optionA}</span>
                        {myVote === 'A' && <span className="opt-check">✓ Your Pick</span>}
                    </button>

                    <div className="game-wyr-divider">OR</div>

                    <button
                        type="button"
                        className={`game-wyr-btn btn-opt-b ${myVote === 'B' ? 'selected' : ''}`}
                        onClick={() => handleWyrVote('B')}
                    >
                        <span className="opt-letter">B</span>
                        <span className="opt-text">{optionB}</span>
                        {myVote === 'B' && <span className="opt-check">✓ Your Pick</span>}
                    </button>
                </div>

                {myVote ? (
                    <div className="game-result-note">
                        <span className="result-icon">✨</span>
                        <span className="result-text">
                            You voted for Option {myVote}! Let {partnerName} know why in the chat.
                        </span>
                    </div>
                ) : (
                    <div className="game-prompt-note">
                        Tap an option to lock in your answer & earn +10 XP!
                    </div>
                )}
            </div>
        );
    }

    if (gameType === 'two_truths_lie') {
        const statements = metadata.statements || [];
        const lieIndex = metadata.lie_index;
        const hasGuessed = gameState.guessIndex !== undefined;
        const isCorrect = gameState.isCorrect;

        return (
            <div className="chat-mini-game-bubble truth-lie-bubble">
                <div className="game-bubble-header">
                    <span className="game-tag">🎯 2 Truths & a Lie</span>
                    {hasGuessed && <span className="game-xp-pill">{isCorrect ? '+15 XP' : '+5 XP'}</span>}
                </div>

                <p className="game-bubble-title">
                    {isSender
                        ? 'You sent this challenge to ' + partnerName + ':'
                        : 'Which statement is the LIE? Tap to guess:'}
                </p>

                <div className="game-truth-lie-list">
                    {statements.map((stmt, idx) => {
                        const isTheLie = idx === lieIndex;
                        const isUserGuess = gameState.guessIndex === idx;

                        let cardClass = 'game-stmt-card';
                        if (isSender) {
                            if (isTheLie) cardClass += ' sender-lie';
                        } else if (hasGuessed) {
                            if (isTheLie) cardClass += ' revealed-lie';
                            else if (isUserGuess && !isCorrect) cardClass += ' wrong-guess';
                        }

                        return (
                            <div
                                key={idx}
                                className={cardClass}
                                onClick={() => !isSender && !hasGuessed && handleGuessLie(idx)}
                                role={!isSender && !hasGuessed ? 'button' : undefined}
                                tabIndex={!isSender && !hasGuessed ? 0 : undefined}
                            >
                                <div className="stmt-top">
                                    <span className="stmt-idx">#{idx + 1}</span>
                                    {isSender && isTheLie && (
                                        <span className="lie-badge-private">🔒 Your Lie</span>
                                    )}
                                    {!isSender && hasGuessed && isTheLie && (
                                        <span className="lie-badge-revealed">🔴 The Lie!</span>
                                    )}
                                    {!isSender && isUserGuess && (
                                        <span className="user-guess-pill">
                                            {isCorrect ? '✓ Spot on!' : '❌ Not the lie'}
                                        </span>
                                    )}
                                </div>
                                <p className="stmt-text">{stmt}</p>
                                {!isSender && !hasGuessed && (
                                    <div className="stmt-tap-hint">Tap to guess this is the lie 👉</div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {isSender && (
                    <div className="game-sender-note">
                        Waiting for {partnerName} to guess which one is your lie! 👀
                    </div>
                )}

                {!isSender && hasGuessed && (
                    <div className={`game-result-banner ${isCorrect ? 'success' : 'miss'}`}>
                        {isCorrect ? (
                            <span>🎉 <strong>Spot on!</strong> You detected the lie and earned +15 XP!</span>
                        ) : (
                            <span>❌ <strong>Gotcha!</strong> That was actually the truth. You earned +5 XP for playing!</span>
                        )}
                    </div>
                )}
            </div>
        );
    }

    return null;
}
