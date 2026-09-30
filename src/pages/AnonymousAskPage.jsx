import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProfileByUsername } from '../services/profileService';
import { sendAnonymousMessage } from '../services/confessionService';
import './AnonymousAskPage.css';

const QUICK_PROMPTS = [
    'What is your honest impression of me? 👀',
    'Who is your secret campus crush? 💘',
    'Tell me something you never told anyone 🤫',
    'What song reminds you of me? 🎶',
    'Drop your wildest confession 🙊'
];

export default function AnonymousAskPage() {
    const { username } = useParams();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        let isMounted = true;
        async function loadProfile() {
            setLoading(true);
            setNotFound(false);
            const { data, error } = await getProfileByUsername(username);
            if (!isMounted) return;
            if (error || !data) {
                setNotFound(true);
            } else {
                setProfile(data);
            }
            setLoading(false);
        }
        if (username) {
            loadProfile();
        }
        return () => { isMounted = false; };
    }, [username]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!message.trim() || sending || !profile) return;
        setSending(true);
        setErrorMsg('');

        const target = profile.username || profile.id;
        const { error } = await sendAnonymousMessage(target, message);
        setSending(false);

        if (error) {
            setErrorMsg(error || 'Failed to send message. Please try again.');
        } else {
            setSent(true);
            setMessage('');
        }
    };

    if (loading) {
        return (
            <div className="ask-page-root">
                <div className="ask-card loading-state">
                    <div className="ask-spinner" />
                    <p>Loading anonymous link...</p>
                </div>
            </div>
        );
    }

    if (notFound || !profile) {
        return (
            <div className="ask-page-root">
                <div className="ask-card not-found-state">
                    <span className="not-found-icon">🔍</span>
                    <h2>Student Not Found</h2>
                    <p>The anonymous link <strong>@{username}</strong> does not exist or has been changed.</p>
                    <Link to="/" className="ask-primary-btn">
                        Go to The College Date
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="ask-page-root">
            {/* Background Glow */}
            <div className="ask-ambient-glow" />

            <div className="ask-container">
                {/* Header Branding */}
                <div className="ask-brand-header">
                    <Link to="/" className="ask-brand-logo">
                        <span className="logo-sparkle">✨</span> The College Date
                    </Link>
                    <span className="ask-brand-badge">Anonymous Q&A</span>
                </div>

                {/* Main Card */}
                <div className="ask-card">
                    {/* Recipient Profile Card */}
                    <div className="ask-recipient-header">
                        <div className="ask-avatar-wrapper">
                            {profile.avatar_url ? (
                                <img
                                    src={profile.avatar_url}
                                    alt={profile.full_name || profile.username}
                                    className="ask-avatar"
                                />
                            ) : (
                                <div className="ask-avatar placeholder">
                                    {(profile.full_name || profile.username || 'U').charAt(0).toUpperCase()}
                                </div>
                            )}
                            {profile.is_verified && (
                                <span className="ask-verified-badge" title="Verified Student">✓</span>
                            )}
                        </div>

                        <div className="ask-recipient-info">
                            <h2 className="ask-recipient-name">
                                {profile.full_name || profile.username}
                            </h2>
                            <p className="ask-recipient-meta">
                                <span>@{profile.username || 'student'}</span>
                                {profile.university && (
                                    <>
                                        <span className="dot">•</span>
                                        <span>🎓 {profile.university}</span>
                                    </>
                                )}
                            </p>
                        </div>
                    </div>

                    {sent ? (
                        <div className="ask-success-view">
                            <div className="success-icon-bounce">💌</div>
                            <h3>Message Sent!</h3>
                            <p>Your secret message was safely delivered to @{profile.username || 'student'}. They will never know who sent it.</p>

                            <button
                                type="button"
                                className="ask-secondary-btn"
                                onClick={() => setSent(false)}
                            >
                                Send another anonymous message ✍️
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSend} className="ask-form">
                            <div className="ask-prompt-banner">
                                <span className="prompt-badge">🤫 100% Anonymous</span>
                                <h3 className="prompt-title">
                                    Send me anonymous confessions, questions, or honest thoughts!
                                </h3>
                            </div>

                            {/* Quick Starter Chips */}
                            <div className="ask-quick-chips">
                                {QUICK_PROMPTS.map((promptText, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        className="ask-chip-btn"
                                        onClick={() => setMessage(promptText)}
                                    >
                                        {promptText}
                                    </button>
                                ))}
                            </div>

                            <div className="ask-input-box">
                                <textarea
                                    className="ask-textarea"
                                    placeholder="Write your anonymous message here... Never holding back! 💬"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    maxLength={500}
                                    rows={4}
                                    required
                                />
                                <div className="ask-char-counter">
                                    {message.length} / 500
                                </div>
                            </div>

                            {errorMsg && (
                                <div className="ask-error-box">
                                    {errorMsg}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="ask-submit-btn"
                                disabled={sending || !message.trim()}
                            >
                                {sending ? 'Sending Secretly...' : '🔒 Send Secret Message'}
                            </button>

                            <div className="ask-privacy-notice">
                                🔒 Anonymous to the recipient. Harassment, threats, and illegal content are strictly prohibited and IP logs will be shared with law enforcement.
                            </div>
                        </form>
                    )}
                </div>

                {/* Viral CTA Card */}
                <div className="ask-viral-box">
                    <div className="viral-box-content">
                        <h4>Want your own anonymous ask link? 📸</h4>
                        <p>Post your link on WhatsApp Status & Instagram to receive questions and confessions from campus friends!</p>
                    </div>
                    <Link to="/signup" className="ask-get-link-btn">
                        Get My Anonymous Link →
                    </Link>
                </div>

                {/* Trust Footer */}
                <div className="ask-footer-trust">
                    <span>🎓 Verified Nigerian Campuses</span>
                    <span>•</span>
                    <span>100% Student Free</span>
                    <span>•</span>
                    <span>Protected by The College Date</span>
                </div>
            </div>
        </div>
    );
}
