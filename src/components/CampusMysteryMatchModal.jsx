import React, { useState, useEffect, useRef } from 'react';
import { 
    findMysteryCandidate, 
    advanceMysterySession,
    formatMysteryCandidate 
} from '../services/mysteryMatchService';
import { 
    getStageBlurStyle, 
    MYSTERY_ICEBREAKERS 
} from '../utils/mysteryMatch';
import { triggerLightHaptic, triggerSuccessHaptic } from '../utils/haptics';
import confetti from 'canvas-confetti';
import './CampusMysteryMatchModal.css';

export default function CampusMysteryMatchModal({
    isOpen,
    onClose,
    currentUserId,
    currentUserProfile,
    onNavigateToChat
}) {
    const [candidate, setCandidate] = useState(null);
    const [loading, setLoading] = useState(true);
    const [stage, setStage] = useState(0);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isRevealed, setIsRevealed] = useState(false);
    const chatEndRef = useRef(null);

    // Load mystery candidate when modal opens
    useEffect(() => {
        if (!isOpen) {
            setCandidate(null);
            setStage(0);
            setMessages([]);
            setInputText('');
            setIsRevealed(false);
            return;
        }

        let isMounted = true;
        async function loadCandidate() {
            setLoading(true);
            const { data } = await findMysteryCandidate(currentUserId, currentUserProfile);
            if (isMounted && data) {
                setCandidate(data);
                setStage(0);
                setIsRevealed(false);
                // Seed candidate's opening icebreaker
                setMessages([
                    {
                        id: `msg_init_${Date.now()}`,
                        senderId: data.id,
                        isSender: false,
                        text: `Hey! 🎭 Let's break the ice: ${data.mysteryIcebreaker}`,
                        time: 'Just now'
                    }
                ]);
            }
            if (isMounted) setLoading(false);
        }

        loadCandidate();
        return () => { isMounted = false; };
    }, [isOpen, currentUserId, currentUserProfile]);

    // Auto-scroll chat
    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    if (!isOpen) return null;

    const blurInfo = getStageBlurStyle(stage);

    const handleSendMessage = async (textToSend) => {
        const text = (textToSend || inputText || '').trim();
        if (!text || isSubmitting || !candidate) return;

        triggerLightHaptic();
        setIsSubmitting(true);
        setInputText('');

        const userMsg = {
            id: `msg_user_${Date.now()}`,
            senderId: currentUserId,
            isSender: true,
            text,
            time: 'Just now'
        };

        const updatedMessages = [...messages, userMsg];
        setMessages(updatedMessages);

        // Advance mystery session
        const nextStageNum = Math.min(3, stage + 1);
        const result = await advanceMysterySession({
            sessionId: `session_${candidate.id}`,
            targetUserId: candidate.id,
            messageText: text,
            currentStage: stage
        });

        const newStage = typeof result.stage === 'number' ? result.stage : nextStageNum;
        setStage(newStage);

        if (newStage >= 3) {
            setIsRevealed(true);
            triggerSuccessHaptic();
            try {
                confetti({
                    particleCount: 80,
                    spread: 70,
                    origin: { y: 0.6 }
                });
            } catch (e) {
                // Ignore confetti error if unavailable
            }
        } else {
            // Simulated playful reply from candidate to keep momentum going
            setTimeout(() => {
                const partnerReplies = [
                    "Haha I feel you on that! What faculty are you in? 💫",
                    "Spot on! 1 more message and we unmask! 🔥",
                    "Love that answer! Final question: what's your vibe on campus?"
                ];
                const replyText = partnerReplies[newStage - 1] || "Nice! Let's keep chatting ✨";
                setMessages(prev => [
                    ...prev,
                    {
                        id: `msg_partner_${Date.now()}`,
                        senderId: candidate.id,
                        isSender: false,
                        text: replyText,
                        time: 'Just now'
                    }
                ]);
            }, 800);
        }

        setIsSubmitting(false);
    };

    const handleSkip = async () => {
        triggerLightHaptic();
        setLoading(true);
        const { data } = await findMysteryCandidate(currentUserId, currentUserProfile);
        if (data) {
            setCandidate(data);
            setStage(0);
            setIsRevealed(false);
            setMessages([
                {
                    id: `msg_init_${Date.now()}`,
                    senderId: data.id,
                    isSender: false,
                    text: `Hey! 🎭 Let's break the ice: ${data.mysteryIcebreaker}`,
                    time: 'Just now'
                }
            ]);
        }
        setLoading(false);
    };

    return (
        <div className="mystery-modal-backdrop" onClick={onClose}>
            <div 
                className="mystery-modal-container animate-scale-up" 
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="mystery-modal-title"
            >
                {/* Header */}
                <div className="mystery-header">
                    <div className="mystery-header-badge">
                        <span className="mystery-live-dot" />
                        <span>PRIMETIME SPEED DATE</span>
                    </div>
                    <button 
                        type="button" 
                        className="mystery-close-btn" 
                        onClick={onClose}
                        aria-label="Close Mystery Match"
                    >
                        ✕
                    </button>
                </div>

                {loading || !candidate ? (
                    <div className="mystery-loading-box">
                        <div className="mystery-spinner" />
                        <p>Pairing you with an active student on campus... 🎭</p>
                    </div>
                ) : (
                    <div className="mystery-body">
                        {/* Progressive Card */}
                        <div className={`mystery-profile-card ${isRevealed ? 'is-revealed' : ''}`}>
                            <div className="mystery-avatar-frame">
                                <img 
                                    src={candidate.maskedAvatar} 
                                    alt="Mystery Student" 
                                    className="mystery-avatar-img"
                                    style={{
                                        filter: blurInfo.filter,
                                        transform: blurInfo.transform,
                                        transition: blurInfo.transition
                                    }}
                                />
                                {!isRevealed && (
                                    <div className="mystery-avatar-overlay">
                                        <span className="mystery-mask-icon">🎭</span>
                                        <span className="mystery-blur-tag">{blurInfo.label}</span>
                                    </div>
                                )}
                                {isRevealed && (
                                    <div className="mystery-revealed-badge animate-bounce-in">
                                        ✨ Verified Identity
                                    </div>
                                )}
                            </div>

                            <div className="mystery-meta">
                                <h3 id="mystery-modal-title" className="mystery-name">
                                    {isRevealed ? candidate.realName : candidate.maskedName}
                                </h3>
                                <p className="mystery-sub">{candidate.displayFaculty}</p>
                                <p className="mystery-campus">🏛️ {candidate.university}</p>

                                <div className="mystery-chips">
                                    <span className="mystery-chip">🎯 {candidate.attraction_goal || 'Just Vibes'}</span>
                                    {Array.isArray(candidate.interests) && candidate.interests.slice(0, 2).map((item, idx) => (
                                        <span key={idx} className="mystery-chip">⚡ {item}</span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Stepper Progress */}
                        <div className="mystery-stepper">
                            <div className="mystery-stepper-header">
                                <span className="mystery-stepper-title">{blurInfo.label}</span>
                                <span className="mystery-stepper-sub">{blurInfo.sublabel}</span>
                            </div>
                            <div className="mystery-progress-track">
                                <div 
                                    className="mystery-progress-fill" 
                                    style={{ width: `${blurInfo.percentage}%` }}
                                />
                            </div>
                            <div className="mystery-steps-row">
                                <div className={`mystery-step-item ${stage >= 1 ? 'step-done' : ''}`}>
                                    <span>1. 🧊 Icebreaker</span>
                                </div>
                                <div className={`mystery-step-item ${stage >= 2 ? 'step-done' : ''}`}>
                                    <span>2. 💫 Chemistry</span>
                                </div>
                                <div className={`mystery-step-item ${stage >= 3 ? 'step-done' : ''}`}>
                                    <span>3. 🎉 Full Reveal</span>
                                </div>
                            </div>
                        </div>

                        {/* Chat Feed */}
                        <div className="mystery-chat-feed">
                            {messages.map(msg => (
                                <div 
                                    key={msg.id} 
                                    className={`mystery-msg-bubble ${msg.isSender ? 'msg-outgoing' : 'msg-incoming'}`}
                                >
                                    <div className="mystery-msg-content">{msg.text}</div>
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Quick Prompt Chips */}
                        {!isRevealed && (
                            <div className="mystery-quick-prompts">
                                {MYSTERY_ICEBREAKERS.slice(0, 3).map((prompt, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        className="mystery-prompt-chip"
                                        onClick={() => handleSendMessage(prompt)}
                                    >
                                        💬 {prompt}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Input or Match Action */}
                        {!isRevealed ? (
                            <div className="mystery-input-bar">
                                <input
                                    type="text"
                                    className="mystery-text-input"
                                    placeholder="Type your message to unmask..."
                                    value={inputText}
                                    onChange={e => setInputText(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') handleSendMessage();
                                    }}
                                    disabled={isSubmitting}
                                />
                                <button
                                    type="button"
                                    className="mystery-send-btn"
                                    onClick={() => handleSendMessage()}
                                    disabled={!inputText.trim() || isSubmitting}
                                >
                                    Send
                                </button>
                                <button
                                    type="button"
                                    className="mystery-skip-btn"
                                    onClick={handleSkip}
                                    title="Skip to next candidate"
                                >
                                    Skip ⏭️
                                </button>
                            </div>
                        ) : (
                            <div className="mystery-revealed-actions animate-fade-in">
                                <div className="mystery-revealed-banner">
                                    <span>🎉 Chemistry Confirmed! Permanent Match Unlocked (+25 XP)</span>
                                </div>
                                <div className="mystery-action-row">
                                    <button
                                        type="button"
                                        className="mystery-chat-now-btn"
                                        onClick={() => {
                                            triggerLightHaptic();
                                            onClose();
                                            if (typeof onNavigateToChat === 'function') {
                                                onNavigateToChat(candidate.id);
                                            }
                                        }}
                                    >
                                        💬 Open In Full Chat
                                    </button>
                                    <button
                                        type="button"
                                        className="mystery-next-date-btn"
                                        onClick={handleSkip}
                                    >
                                        Next Mystery Date 🎭
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
