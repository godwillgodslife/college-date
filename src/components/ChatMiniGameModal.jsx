import React, { useState } from 'react';
import { triggerLightHaptic, triggerSuccessHaptic } from '../utils/haptics';
import { WOULD_YOU_RATHER_PRESETS, TWO_TRUTHS_IDEAS } from '../utils/miniGames';
import './ChatMiniGameModal.css';

export { WOULD_YOU_RATHER_PRESETS, TWO_TRUTHS_IDEAS };

export default function ChatMiniGameModal({
    isOpen,
    onClose,
    onSendGame,
    partnerName = 'your match'
}) {
    const [activeGame, setActiveGame] = useState('wyr'); // 'wyr' | 'truth_lie'
    const [selectedWyrIndex, setSelectedWyrIndex] = useState(0);

    // 2 Truths & a Lie states
    const [statements, setStatements] = useState(['', '', '']);
    const [lieIndex, setLieIndex] = useState(0); // 0, 1, or 2

    if (!isOpen) return null;

    const handleRandomizeWyr = () => {
        triggerLightHaptic();
        let nextIndex;
        do {
            nextIndex = Math.floor(Math.random() * WOULD_YOU_RATHER_PRESETS.length);
        } while (nextIndex === selectedWyrIndex && WOULD_YOU_RATHER_PRESETS.length > 1);
        setSelectedWyrIndex(nextIndex);
    };

    const handleSendWyr = () => {
        triggerSuccessHaptic();
        const current = WOULD_YOU_RATHER_PRESETS[selectedWyrIndex];
        onSendGame({
            type: 'mini_game',
            content: `🎮 Would You Rather: ${current.optionA} OR ${current.optionB}?`,
            metadata: {
                game_type: 'would_you_rather',
                preset_id: current.id,
                title: current.title,
                option_a: current.optionA,
                option_b: current.optionB,
                votes: {}
            }
        });
        onClose();
    };

    const handleAddIdea = (ideaText) => {
        triggerLightHaptic();
        const emptyIdx = statements.findIndex(s => !s.trim());
        if (emptyIdx !== -1) {
            const next = [...statements];
            next[emptyIdx] = ideaText;
            setStatements(next);
        } else {
            // Replace first statement
            const next = [...statements];
            next[0] = ideaText;
            setStatements(next);
        }
    };

    const handleStatementChange = (index, val) => {
        const next = [...statements];
        next[index] = val;
        setStatements(next);
    };

    const isTruthLieValid = statements.every(s => s.trim().length >= 3);

    const handleSendTruthLie = () => {
        if (!isTruthLieValid) return;
        triggerSuccessHaptic();
        onSendGame({
            type: 'mini_game',
            content: `🎯 2 Truths & a Lie: Can you guess which one is false?`,
            metadata: {
                game_type: 'two_truths_lie',
                statements: statements.map(s => s.trim()),
                lie_index: lieIndex,
                revealed: false,
                guesses: {}
            }
        });
        onClose();
    };

    const currentWyr = WOULD_YOU_RATHER_PRESETS[selectedWyrIndex];

    return (
        <div className="mini-game-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Campus Mini-Games">
            <div className="mini-game-modal-sheet" onClick={(e) => e.stopPropagation()}>
                <div className="mini-game-modal-handle" />

                <div className="mini-game-modal-header">
                    <div className="mini-game-title-row">
                        <span className="mini-game-icon">🎮</span>
                        <h2 className="mini-game-title">Break The Ice</h2>
                    </div>
                    <button type="button" className="mini-game-btn-close" onClick={onClose} aria-label="Close">
                        ✕
                    </button>
                </div>

                <p className="mini-game-subtitle">
                    Play fun collegiate icebreakers with <strong>{partnerName}</strong> and earn streak XP!
                </p>

                {/* Game Tabs */}
                <div className="mini-game-tabs">
                    <button
                        type="button"
                        className={`mini-game-tab-btn ${activeGame === 'wyr' ? 'active' : ''}`}
                        onClick={() => { triggerLightHaptic(); setActiveGame('wyr'); }}
                    >
                        <span>🤔 Would You Rather</span>
                    </button>
                    <button
                        type="button"
                        className={`mini-game-tab-btn ${activeGame === 'truth_lie' ? 'active' : ''}`}
                        onClick={() => { triggerLightHaptic(); setActiveGame('truth_lie'); }}
                    >
                        <span>🎯 2 Truths & a Lie</span>
                    </button>
                </div>

                {/* Game 1: Would You Rather */}
                {activeGame === 'wyr' && (
                    <div className="mini-game-content-panel animate-fade-in">
                        <div className="wyr-card-preview">
                            <div className="wyr-badge-strip">
                                <span className="wyr-category-pill">{currentWyr.title}</span>
                                <button type="button" className="btn-shuffle-wyr" onClick={handleRandomizeWyr} title="Next random question">
                                    🎲 Shuffle
                                </button>
                            </div>

                            <div className="wyr-options-container">
                                <div className="wyr-option-box option-a">
                                    <span className="wyr-letter">Option A</span>
                                    <p className="wyr-text">{currentWyr.optionA}</p>
                                </div>
                                <div className="wyr-or-divider">OR</div>
                                <div className="wyr-option-box option-b">
                                    <span className="wyr-letter">Option B</span>
                                    <p className="wyr-text">{currentWyr.optionB}</p>
                                </div>
                            </div>
                        </div>

                        <div className="mini-game-modal-actions">
                            <button type="button" className="btn-send-game primary" onClick={handleSendWyr}>
                                🚀 Send Dilemma to Chat (+10 XP)
                            </button>
                        </div>
                    </div>
                )}

                {/* Game 2: 2 Truths & a Lie */}
                {activeGame === 'truth_lie' && (
                    <div className="mini-game-content-panel animate-fade-in">
                        <div className="truth-lie-instructions">
                            Enter 2 true statements and 1 lie. Mark which statement is the lie so {partnerName} can guess!
                        </div>

                        <div className="truth-lie-inputs-list">
                            {[0, 1, 2].map((idx) => {
                                const isSelectedLie = lieIndex === idx;
                                return (
                                    <div key={idx} className={`truth-lie-input-group ${isSelectedLie ? 'is-lie' : ''}`}>
                                        <div className="truth-lie-input-header">
                                            <span className="truth-lie-number">#{idx + 1}</span>
                                            <button
                                                type="button"
                                                className={`btn-toggle-lie ${isSelectedLie ? 'active' : ''}`}
                                                onClick={() => { triggerLightHaptic(); setLieIndex(idx); }}
                                            >
                                                {isSelectedLie ? '🔴 Marked as Lie' : 'Mark as Lie'}
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            className="truth-lie-input"
                                            placeholder={`Statement #${idx + 1}...`}
                                            value={statements[idx]}
                                            onChange={(e) => handleStatementChange(idx, e.target.value)}
                                            maxLength={100}
                                        />
                                    </div>
                                );
                            })}
                        </div>

                        {/* Quick ideas chips */}
                        <div className="truth-lie-ideas-strip">
                            <span className="ideas-label">💡 Tap for quick inspiration:</span>
                            <div className="ideas-chips-scroll">
                                {TWO_TRUTHS_IDEAS.map((idea, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        className="idea-chip"
                                        onClick={() => handleAddIdea(idea)}
                                    >
                                        + {idea}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mini-game-modal-actions">
                            <button
                                type="button"
                                className="btn-send-game primary"
                                disabled={!isTruthLieValid}
                                onClick={handleSendTruthLie}
                            >
                                🎯 Send Challenge to Chat (+15 XP)
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
