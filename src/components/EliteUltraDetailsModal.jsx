import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './EliteUltraDetailsModal.css';

export default function EliteUltraDetailsModal({ isOpen, onClose, onSelectPlan }) {
    const navigate = useNavigate();

    if (!isOpen) return null;

    const handleProceed = (tierId = 'ultra_3month') => {
        if (typeof onSelectPlan === 'function') {
            onSelectPlan(tierId);
        } else {
            navigate(`/premium?tier=ultra&selected=${tierId}`);
        }
        if (typeof onClose === 'function') onClose();
    };

    return (
        <AnimatePresence>
            <div className="elite-ultra-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="ultra-modal-title">
                <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: 20 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className="elite-ultra-modal-card"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        type="button"
                        className="ultra-modal-close-btn"
                        onClick={onClose}
                        aria-label="Close dialog"
                    >
                        ✕
                    </button>

                    <div className="ultra-modal-crest">
                        <span className="ultra-crest-icon">👑⭐</span>
                    </div>

                    <div className="ultra-modal-header">
                        <span className="ultra-tier-pill">TOP TIER MEMBERSHIP • ₦25,000 MONTHLY VALUE</span>
                        <h2 id="ultra-modal-title" className="ultra-modal-title">College Date Elite Ultra</h2>
                        <p className="ultra-modal-subtitle">
                            The Campus Celebrity tier for instant results. Share contacts freely, dominate everyone's feed with 10 boosts, send 30 direct crush alerts (Super Swipes), and show your full 6-photo gallery with a 30s live video.
                        </p>
                    </div>

                    {/* Pricing Selector Grid */}
                    <div className="ultra-pricing-pills-row">
                        <button
                            type="button"
                            className="ultra-price-pill"
                            onClick={() => handleProceed('ultra_monthly')}
                        >
                            <span className="pill-duration">1 Month</span>
                            <span className="pill-amount">₦15,000</span>
                            <span className="pill-rate">₦500/day</span>
                        </button>

                        <button
                            type="button"
                            className="ultra-price-pill"
                            onClick={() => handleProceed('ultra_2month')}
                        >
                            <span className="pill-duration">2 Months</span>
                            <span className="pill-amount">₦30,000</span>
                            <span className="pill-rate">₦500/day</span>
                        </button>

                        <button
                            type="button"
                            className="ultra-price-pill featured"
                            onClick={() => handleProceed('ultra_3month')}
                        >
                            <span className="pill-badge">SAVE ₦10,000</span>
                            <span className="pill-duration">3 Months</span>
                            <span className="pill-amount">₦35,000</span>
                            <span className="pill-rate">₦389/day</span>
                        </button>
                    </div>

                    {/* Feature Highlight List */}
                    <div className="ultra-features-list">
                        <div className="ultra-feature-row">
                            <span className="feature-icon">💬</span>
                            <div className="feature-text">
                                <strong>Unrestricted Contact Sharing</strong>
                                <span>Freely ask for & share WhatsApp, phone numbers & social handles in chat without filter blocks.</span>
                            </div>
                        </div>

                        <div className="ultra-feature-row">
                            <span className="feature-icon">📱</span>
                            <div className="feature-text">
                                <strong>Public Bio Contact Display</strong>
                                <span>Add your WhatsApp line & Instagram directly in your bio without censorship or masking.</span>
                            </div>
                        </div>

                        <div className="ultra-feature-row">
                            <span className="feature-icon">🎬</span>
                            <div className="feature-text">
                                <strong>Extended 30s HD Video Profile</strong>
                                <span>Showcase your authentic charisma with a full 30-second live video (3x standard Premium limit).</span>
                            </div>
                        </div>

                        <div className="ultra-feature-row">
                            <span className="feature-icon">⭐</span>
                            <div className="feature-text">
                                <strong>30 Super Swipes / Month Included</strong>
                                <span>Direct crush alert with priority notification (Valued at ₦15,000).</span>
                            </div>
                        </div>

                        <div className="ultra-feature-row">
                            <span className="feature-icon">🚀</span>
                            <div className="feature-text">
                                <strong>10 24h Visibility Boosts / Month Included</strong>
                                <span>Jump straight to the top of everyone's campus feed (Valued at ₦10,000).</span>
                            </div>
                        </div>

                        <div className="ultra-feature-row">
                            <span className="feature-icon">📸</span>
                            <div className="feature-text">
                                <strong>Up to 6 Profile Photos in Match</strong>
                                <span>Showcase your full gallery (Free & basic accounts capped at 3).</span>
                            </div>
                        </div>

                        <div className="ultra-feature-row">
                            <span className="feature-icon">👑</span>
                            <div className="feature-text">
                                <strong>VIP Spotlight Placement & Radiant Pink-Gold Crown</strong>
                                <span>Command instant attention with prominent radiant crowns across Explore, Match, and Confessions posts & comments.</span>
                            </div>
                        </div>

                        <div className="ultra-feature-row">
                            <span className="feature-icon">✨</span>
                            <div className="feature-text">
                                <strong>All Elite Benefits Included</strong>
                                <span>Unlimited Swipes, Unlimited Campus Finder, Secret Admirers, Unlimited HD Calls, and Incognito Ghost Mode.</span>
                            </div>
                        </div>
                    </div>

                    {/* Allowance Separation Reassurance */}
                    <div className="ultra-reassurance-box">
                        <span className="reassurance-icon">🛡️</span>
                        <div className="reassurance-text">
                            <strong>Transparent Allowance Invariant:</strong>
                            <p>
                                Monthly Super Swipes and Boosts are finite allowances included with your subscription. They never deplete your campus wallet or coin balance.
                            </p>
                        </div>
                    </div>

                    {/* CTA Actions */}
                    <div className="ultra-modal-actions">
                        <button
                            type="button"
                            className="btn-ultra-modal-cta"
                            onClick={() => handleProceed('ultra_3month')}
                        >
                            <span>Explore Elite Ultra Plans →</span>
                        </button>
                        <button
                            type="button"
                            className="btn-ultra-modal-dismiss"
                            onClick={onClose}
                        >
                            Maybe Later
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
