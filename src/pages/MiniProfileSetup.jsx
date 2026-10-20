import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { uploadProfilePhoto, upsertProfile } from '../services/profileService';
import { requestProfileAiReview } from '../services/aiTrustService';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import { safeArray } from '../utils/profileData';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import FaceVerificationModal from '../components/FaceVerificationModal';
import { AFRICAN_COUNTRIES, searchUniversities } from '../constants/universities';
import './MiniProfileSetup.css';

const STEPS = [
    { id: 'identity', title: "What's your name?", subtitle: "And how old are you?" },
    { id: 'campus', title: "Where do you study?", subtitle: "Find people on your campus" },
    { id: 'vibe', title: "The Vibe", subtitle: "What are you into? (Max 10)" },
    { id: 'intent', title: "What's the goal?", subtitle: "What are you looking for?" },
    { id: 'photo', title: "Show yourself!", subtitle: "Upload your best photo" },
    { id: 'success', title: "You're in!", subtitle: "Welcome to the Crew" }
];

const INTERESTS_OPTIONS = [
    '🍕 Foodie', '📚 Night Class', '💃 Party', '🎧 Music', '🎮 Gaming',
    '🏀 Sports', '🎨 Art', '✈️ Travel', '💻 Tech', '🏋️ Fitness'
];

const INTENT_OPTIONS = [
    { value: 'Casual', label: 'Casual', icon: '🥂', desc: 'Just seeing where it goes' },
    { value: 'Serious', label: 'Serious', icon: '💝', desc: 'Looking for a real connection' },
    { value: 'Friends', label: 'Friends', icon: '🤝', desc: 'Expanding the social circle' }
];

const LEVEL_OPTIONS = ['100L', '200L', '300L', '400L', '500L', 'Graduate'];

const POPULAR_CAMPUSES = [
    { label: 'UNILAG', name: 'University of Lagos (UNILAG)' },
    { label: 'LASU', name: 'Lagos State University (LASU)' },
    { label: 'UI', name: 'University of Ibadan (UI)' },
    { label: 'OAU', name: 'Obafemi Awolowo University (OAU)' },
    { label: 'FUTA', name: 'Federal University of Technology, Akure (FUTA)' },
    { label: 'UNIBEN', name: 'University of Benin (UNIBEN)' },
    { label: 'UNN', name: 'University of Nigeria, Nsukka (UNN)' },
    { label: 'ABU', name: 'Ahmadu Bello University (ABU)' },
    { label: 'Covenant', name: 'Covenant University' },
    { label: 'Babcock', name: 'Babcock University' }
];

export default function MiniProfileSetup() {
    const { currentUser, userProfile, fetchProfile, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [direction, setDirection] = useState(0);
    const [selectedCountry, setSelectedCountry] = useState('ALL');
    const [universitySearch, setUniversitySearch] = useState('');
    const [showUniDropdown, setShowUniDropdown] = useState(false);
    const [showFaceVerify, setShowFaceVerify] = useState(false);
    const [isPhotoVerified, setIsPhotoVerified] = useState(false);

    const [formData, setFormData] = useState(() => {
        const saved = localStorage.getItem('onboarding_data');
        let parsed = null;
        try {
            parsed = saved ? JSON.parse(saved) : null;
        } catch {
            localStorage.removeItem('onboarding_data');
        }
        return parsed ? {
            ...parsed,
            interests: safeArray(parsed.interests),
            profile_photos: safeArray(parsed.profile_photos)
        } : {
            full_name: '',
            age: '',
            university: '',
            level: '',
            interests: [],
            intent: '',
            profile_photos: []
        };
    });

    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
    const isPreview = searchParams.get('preview') === 'true';

    useEffect(() => {
        if (isPreview) return;
        localStorage.setItem('onboarding_data', JSON.stringify(formData));
        localStorage.setItem('onboarding_step', currentStep.toString());
    }, [formData, currentStep, isPreview]);

    useEffect(() => {
        const queryStep = searchParams.get('step');
        if (queryStep !== null && !isNaN(parseInt(queryStep, 10))) {
            setCurrentStep(parseInt(queryStep, 10));
            return;
        }
        const savedStep = localStorage.getItem('onboarding_step');
        if (savedStep) setCurrentStep(parseInt(savedStep));
    }, []);

    // 🚀 Auto-Redirect Escape Hatch: If user is already complete, don't trap them here!
    useEffect(() => {
        if (!authLoading && userProfile && !isPreview) {
            const hasFullName = userProfile.full_name && userProfile.full_name.trim().length > 1;
            const hasUniversity = userProfile.university && userProfile.university !== 'None';
            const hasPhoto = (safeArray(userProfile.profile_photos).filter(p => p && p !== '').length >= 1) || 
                             (userProfile.avatar_url && userProfile.avatar_url.startsWith('http'));
            const isManuallyComplete = userProfile.is_onboarded === true;

            if (isManuallyComplete || (hasFullName && hasUniversity && hasPhoto)) {
                console.log('[Setup] User is already fully onboarded. Escaping to /match');
                navigate('/match', { replace: true });
            }
        }
    }, [userProfile, authLoading, navigate, isPreview]);

    const triggerHaptic = () => {
        if (window.navigator?.vibrate) {
            window.navigator.vibrate(20);
        }
    };

    const handleNext = () => {
        triggerHaptic();
        if (currentStep < STEPS.length - 1) {
            setDirection(1);
            setCurrentStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        triggerHaptic();
        if (currentStep > 0) {
            setDirection(-1);
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleInterestToggle = (interest) => {
        triggerHaptic();
        setFormData(prev => {
            const currentInterests = safeArray(prev.interests);
            const interests = currentInterests.includes(interest)
                ? currentInterests.filter(i => i !== interest)
                : (currentInterests.length < 10 ? [...currentInterests, interest] : currentInterests);
            return { ...prev, interests };
        });
    };

    const handlePhotoUpload = async (e, index) => {
        const file = e.target.files[0];
        if (!file) return;

        let targetUserId = currentUser?.id;
        if (!targetUserId) {
            const { data: { session } } = await supabase.auth.getSession();
            targetUserId = session?.user?.id;
        }
        if (!targetUserId) {
            addToast("Your session has expired. Please log in again.", "error");
            return;
        }

        setLoading(true);
        addToast('Checking photo quality...', 'info');
        try {
            const { url, approved, reason, error } = await uploadProfilePhoto(file, targetUserId, index);
            if (error || !approved) throw new Error(reason || error || 'Photo failed validation');

            if (index === 0) {
                setIsPhotoVerified(false);
            }

            setFormData(prev => {
                const newPhotos = [...safeArray(prev.profile_photos)];
                newPhotos[index] = url;
                return { ...prev, profile_photos: newPhotos };
            });
            addToast('Photo uploaded & approved! 📸', 'success');
        } catch (err) {
            addToast(err.message, 'error');
        } finally {
            setLoading(false);
            if (e.target) e.target.value = '';
        }
    };

    const handleFinish = async () => {
        setLoading(true);
        try {
            const parsedAge = parseInt(formData.age, 10);
            if (isNaN(parsedAge) || parsedAge < 18) {
                throw new Error("You must be at least 18 years old to use College Date.");
            }

            let targetUserId = currentUser?.id;
            let targetEmail = currentUser?.email;

            if (!targetUserId) {
                const { data: { session } } = await supabase.auth.getSession();
                targetUserId = session?.user?.id;
                targetEmail = session?.user?.email;
            }

            if (!targetUserId) {
                throw new Error("Your session has expired. Please log in again.");
            }

            console.log('[Setup] Finishing onboarding for:', targetUserId);

            const profilePhotos = safeArray(formData.profile_photos).filter(p => Boolean(p && String(p).trim().length > 0));
            if (profilePhotos.length === 0) {
                throw new Error("Please upload at least one profile photo to continue.");
            }

            const profileData = {
                full_name: formData.full_name,
                age: parsedAge,
                university: formData.university,
                level: formData.level,
                interests: safeArray(formData.interests),
                attraction_goal: formData.intent,
                profile_photos: profilePhotos,
                avatar_url: profilePhotos[0],
                email: targetEmail,
                is_onboarded: true, // Explicitly mark as done
                photo_verified: isPhotoVerified,
                is_verified: isPhotoVerified,
                photo_updated_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { data: updatedProfile, error } = await upsertProfile(targetUserId, profileData);
            if (error) throw new Error(error);

            console.log('[Setup] Upsert success. Verifying profile state...');
            await fetchProfile(targetUserId);
            requestProfileAiReview('onboarding_complete');
            
            // Clean up ONLY after we are sure we've saved
            localStorage.removeItem('onboarding_data');
            localStorage.removeItem('onboarding_step');

            // Trigger Confetti
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#ff4b4b', '#ff8e53', '#ffffff']
            });

            handleNext(); // Move to success screen
        } catch (err) {
            console.error('[Setup] handleFinish error:', err);
            addToast(err.message || 'Failed to complete profile setup', 'error');
        } finally {
            setLoading(false);
        }
    };


    const isStepValid = () => {
        switch (currentStep) {
            case 0: return formData.full_name.trim().length > 1 && formData.age >= 18;
            case 1: return formData.university && formData.level;
            case 2: return safeArray(formData.interests).length >= 3;
            case 3: return formData.intent;
            case 4: return safeArray(formData.profile_photos).length > 0;
            default: return true;
        }
    };

    if (authLoading) return <LoadingSpinner fullScreen />;

    const variants = {
        enter: (direction) => ({
            x: direction > 0 ? '100%' : '-100%',
            opacity: 0
        }),
        center: {
            x: 0,
            opacity: 1
        },
        exit: (direction) => ({
            x: direction < 0 ? '100%' : '-100%',
            opacity: 0
        })
    };

    // Filtered universities for autocomplete across Africa
    const filteredUnis = searchUniversities(universitySearch, selectedCountry);

    return (
        <div className="quiz-onboarding-page">
            <div className="quiz-progress-bar">
                <motion.div
                    className="progress-fill"
                    animate={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
                    transition={{ duration: 0.5 }}
                />
            </div>

            <div className="quiz-steps-dots">
                {STEPS.map((step, idx) => (
                    <span 
                        key={step.id} 
                        className={`step-dot-pill ${idx < currentStep ? 'done' : ''} ${idx === currentStep ? 'active' : ''}`}
                    />
                ))}
            </div>

            <div className="quiz-container">
                <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                        key={currentStep}
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="quiz-screen"
                    >
                        <div className="quiz-header">
                            <span className="step-indicator">Step {currentStep + 1} of {STEPS.length}</span>
                            <h1 className="quiz-title">{STEPS[currentStep].title}</h1>
                            <p className="quiz-subtitle">{STEPS[currentStep].subtitle}</p>
                        </div>

                        <div className="quiz-content">
                            {currentStep === 0 && (
                                <div className="quiz-form">
                                    <div className="quiz-input-group">
                                        <input
                                            type="text"
                                            placeholder="Your Name"
                                            value={formData.full_name}
                                            onChange={(e) => setFormData(p => ({ ...p, full_name: e.target.value }))}
                                            className="big-input"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="quiz-input-group">
                                        <input
                                            type="number"
                                            placeholder="How old are you? (18+)"
                                            min="18"
                                            max="99"
                                            value={formData.age}
                                            onChange={(e) => setFormData(p => ({ ...p, age: e.target.value }))}
                                            className={`big-input ${formData.age && parseInt(formData.age, 10) < 18 ? 'input-error' : ''}`}
                                        />
                                        {formData.age && parseInt(formData.age, 10) < 18 && (
                                            <p className="error-text" style={{ color: '#ff4b4b', fontSize: '0.85rem', marginTop: '0.5rem', textAlign: 'left' }}>
                                                You must be at least 18 years old.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {currentStep === 1 && (
                                <div className="quiz-form">
                                    {/* African Countries Quick Filter Pills */}
                                    <div className="african-countries-container">
                                        <span className="country-filter-label">Select Country:</span>
                                        <div className="african-countries-pills">
                                            {AFRICAN_COUNTRIES.map(c => (
                                                <button
                                                    key={c.code}
                                                    type="button"
                                                    className={`country-pill ${selectedCountry === c.code ? 'active' : ''}`}
                                                    onClick={() => setSelectedCountry(c.code)}
                                                >
                                                    {c.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* 1-Tap Popular Campuses Row */}
                                    <div className="popular-campuses-container">
                                        <span className="country-filter-label">🔥 Popular Campuses:</span>
                                        <div className="popular-campuses-pills">
                                            {POPULAR_CAMPUSES.map(camp => (
                                                <button
                                                    key={camp.label}
                                                    type="button"
                                                    className={`popular-campus-pill ${formData.university === camp.name ? 'active' : ''}`}
                                                    onClick={() => {
                                                        triggerHaptic();
                                                        setFormData(p => ({ ...p, university: camp.name }));
                                                        setUniversitySearch(camp.name);
                                                        setShowUniDropdown(false);
                                                    }}
                                                >
                                                    {camp.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="quiz-input-group university-select">
                                        <input
                                            type="text"
                                            placeholder={selectedCountry === 'ALL' ? "Search any university in Africa..." : "Search university..."}
                                            value={universitySearch}
                                            onChange={(e) => {
                                                setUniversitySearch(e.target.value);
                                                setShowUniDropdown(true);
                                            }}
                                            onFocus={() => setShowUniDropdown(true)}
                                            className="big-input"
                                        />
                                        {showUniDropdown && (
                                            <div className="uni-dropdown">
                                                {filteredUnis.map(u => (
                                                    <div
                                                        key={u}
                                                        className="uni-option"
                                                        onClick={() => {
                                                            setFormData(p => ({ ...p, university: u }));
                                                            setUniversitySearch(u);
                                                            setShowUniDropdown(false);
                                                        }}
                                                    >
                                                        {u}
                                                    </div>
                                                ))}
                                                {universitySearch.trim().length > 1 && !filteredUnis.includes(universitySearch.trim()) && (
                                                    <div
                                                        className="uni-option custom-uni-option"
                                                        onClick={() => {
                                                            const customUni = universitySearch.trim();
                                                            setFormData(p => ({ ...p, university: customUni }));
                                                            setShowUniDropdown(false);
                                                        }}
                                                    >
                                                        ✨ Use "{universitySearch.trim()}" as my university
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {formData.university && (
                                        <div className="selected-uni-badge">
                                            <span>🎓 {formData.university}</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setFormData(p => ({ ...p, university: '' }));
                                                    setUniversitySearch('');
                                                    setShowUniDropdown(true);
                                                }}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    )}
                                    {formData.university ? (
                                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="level-selection-container">
                                            <p className="level-prompt-text" style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', marginTop: '1rem', textAlign: 'left' }}>Select your current level:</p>
                                            <div className="level-grid">
                                                {LEVEL_OPTIONS.map(lvl => (
                                                    <button
                                                        key={lvl}
                                                        type="button"
                                                        className={`level-btn ${formData.level === lvl ? 'active' : ''}`}
                                                        onClick={() => setFormData(p => ({ ...p, level: lvl }))}
                                                    >
                                                        {lvl}
                                                    </button>
                                                ))}
                                            </div>
                                            <p className="onboarding-context-note" style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: '1.2rem', fontStyle: 'italic', textAlign: 'left' }}>
                                                Selected university and level can be updated later in Settings.
                                            </p>
                                        </motion.div>
                                    ) : (
                                        <div className="onboarding-help-text" style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)', marginTop: '2rem', textAlign: 'center' }}>
                                            Type and select your university above to choose your level.
                                        </div>
                                    )}
                                </div>
                            )}

                            {currentStep === 2 && (
                                <div className="mood-bubbles-grid">
                                    {INTERESTS_OPTIONS.map(vibe => (
                                        <button
                                            key={vibe}
                                            className={`mood-bubble ${safeArray(formData.interests).includes(vibe) ? 'active' : ''}`}
                                            onClick={() => handleInterestToggle(vibe)}
                                        >
                                            {vibe}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {currentStep === 3 && (
                                <div className="intent-cards-grid">
                                    {INTENT_OPTIONS.map(opt => (
                                        <div
                                            key={opt.value}
                                            className={`intent-card ${formData.intent === opt.value ? 'active' : ''}`}
                                            onClick={() => {
                                                triggerHaptic();
                                                setFormData(p => ({ ...p, intent: opt.value }));
                                            }}
                                        >
                                            <span className="intent-icon">{opt.icon}</span>
                                            <div className="intent-info">
                                                <h3>{opt.label}</h3>
                                                <p>{opt.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {currentStep === 4 && (
                                <div className="photo-upload-step">
                                    <div className="photos-grid">
                                        {[0, 1, 2].map(index => (
                                            <div key={index} className={`quiz-photo-preview ${safeArray(formData.profile_photos)[index] ? 'has-photo' : ''}`}>
                                                {safeArray(formData.profile_photos)[index] ? (
                                                    <img src={safeArray(formData.profile_photos)[index]} alt={`Preview ${index + 1}`} />
                                                ) : (
                                                    <div className="photo-placeholder">
                                                        <span>📸</span>
                                                    </div>
                                                )}
                                                <label className="photo-upload-overlay">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => handlePhotoUpload(e, index)}
                                                        hidden
                                                        disabled={loading}
                                                    />
                                                    {loading ? '...' : (safeArray(formData.profile_photos)[index] ? 'Change' : '+ Add')}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="photo-tip">Tip: Adding more photos gets you more matches! ✨</p>

                                    {safeArray(formData.profile_photos).filter(Boolean).length > 0 && (
                                        <div className="onboarding-verify-box">
                                            <div className="onboarding-verify-header">
                                                <span className="onboarding-verify-icon">🛡️</span>
                                                <div className="onboarding-verify-info">
                                                    <h4>Get Photo Verified (Recommended)</h4>
                                                    <p>
                                                        {isPhotoVerified
                                                            ? 'Your face matched your profile photos! Green ✓ Verified badge is active.'
                                                            : 'Confirm you look like your photos with a 5-second selfie scan to get the green ✓ badge immediately.'}
                                                    </p>
                                                </div>
                                            </div>
                                            {isPhotoVerified ? (
                                                <div className="onboarding-verified-badge">
                                                    <span>✓ Face Verified! Green Badge Active</span>
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    className="btn btn-primary onboarding-verify-btn"
                                                    onClick={() => setShowFaceVerify(true)}
                                                >
                                                    📷 Scan Face & Verify Now
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {currentStep === 5 && (
                                <div className="success-screen">
                                    <div className="success-emoji">🚀</div>
                                    <p className="success-message">You're all set! Time to find your matches.</p>

                                    <div className="campus-code-pledge-card">
                                        <div className="campus-code-title">🛡️ The Campus Code</div>
                                        <p>By entering discovery, you commit to mutual respect, student consent, and keeping our campus community safe & friendly.</p>
                                    </div>

                                    <div className="success-cta-actions">
                                        <button
                                            type="button"
                                            className="quiz-final-btn"
                                            onClick={() => navigate('/match')}
                                        >
                                            Start Matching 💘
                                        </button>
                                        <button
                                            type="button"
                                            className="quiz-secondary-feed-btn"
                                            onClick={() => navigate('/confessions')}
                                        >
                                            Read Campus Confessions 🤫
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {currentStep < 5 && (
                            <div className="quiz-footer">
                                <div className="thumb-zone">
                                    {currentStep > 0 && (
                                        <button className="quiz-back-btn" onClick={handleBack} disabled={loading}>
                                            Back
                                        </button>
                                    )}
                                    <button
                                        className={`quiz-next-btn ${currentStep === 4 ? 'finish' : ''}`}
                                        disabled={!isStepValid() || loading}
                                        onClick={currentStep === 4 ? handleFinish : handleNext}
                                    >
                                        {loading ? 'Wait...' : (currentStep === 4 ? "Let's Go! 🚀" : 'Next')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            <FaceVerificationModal
                isOpen={showFaceVerify}
                onClose={() => setShowFaceVerify(false)}
                candidatePhotoUrl={safeArray(formData.profile_photos).filter(Boolean)[0] || formData.avatar_url}
                onVerified={() => {
                    setIsPhotoVerified(true);
                    setShowFaceVerify(false);
                }}
            />
        </div>
    );
}
