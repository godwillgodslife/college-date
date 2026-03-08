import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { uploadProfilePhoto, upsertProfile } from '../services/profileService';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import { motion, AnimatePresence } from 'framer-motion';
import imageCompression from 'browser-image-compression';
import confetti from 'canvas-confetti';
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

const UNIVERSITY_OPTIONS = [
    // Federal Universities
    'University of Lagos (UNILAG)',
    'University of Ibadan (UI)',
    'Obafemi Awolowo University (OAU)',
    'Ahmadu Bello University (ABU)',
    'University of Ilorin (UNILORIN)',
    'University of Benin (UNIBEN)',
    'University of Nigeria, Nsukka (UNN)',
    'University of Port Harcourt (UNIPORT)',
    'University of Calabar (UNICAL)',
    'University of Abuja (UNIABUJA)',
    'University of Jos (UNIJOS)',
    'University of Maiduguri (UNIMAID)',
    'University of Ado-Ekiti (UNIADY)',
    'Federal University, Oye-Ekiti (FUOYE)',
    'Federal University, Kashere (FUK)',
    'Federal University, Lafia (FULAFIA)',
    'Federal University, Lokoja (FULOKOJA)',
    'Federal University, Ndufu-Alike (FUNAI)',
    'Federal University, Otuoke (FUO)',
    'Federal University, Birnin Kebbi (FUBK)',
    'Federal University, Dutse (FUD)',
    'Federal University, Dutsin-Ma (FUDMA)',
    'Federal University, Gusau (FUGUS)',
    'Federal University, Wukari (FUW)',
    'Federal University of Agriculture, Abeokuta (FUNAAB)',
    'Federal University of Agriculture, Makurdi (FUAM)',
    'Federal University of Petroleum Resources, Effurun (FUPRE)',
    'Federal University of Technology, Minna (FUTMINNA)',
    'Federal University of Technology, Owerri (FUTO)',
    'Federal University of Technology, Akure (FUTA)',
    'Michael Okpara University of Agriculture, Umudike (MOUAU)',
    'National Open University of Nigeria (NOUN)',
    'Nigerian Defence Academy (NDA)',
    'Air Force Institute of Technology (AFIT)',
    'Nigerian Army University, Biu (NAUB)',
    'Nigerian Police Academy, Wudil (POLAC)',

    // State Universities
    'Lagos State University (LASU)',
    'Rivers State University (RSU)',
    'Enugu State University of Science and Technology (ESUT)',
    'Imo State University (IMSU)',
    'Delta State University (DELSU)',
    'Anambra State University (ANSU)',
    'Cross River University of Technology (CRUTECH)',
    'Abia State University, Uturu (ABSU)',
    'Akwa Ibom State University (AKSU)',
    'Bayelsa Medical University (BMU)',
    'Niger Delta University (NDU)',
    'Ignatius Ajuru University of Education (IAUE)',
    'Ken Saro-Wiwa Polytechnic (KENPOLY)',
    'Kogi State University (KSU)',
    'Benue State University (BSU)',
    'Nasarawa State University (NSU)',
    'Plateau State University (PLASU)',
    'Taraba State University (TSU)',
    'Adamawa State University (ADSU)',
    'Gombe State University (GSU)',
    'Kebbi State University of Science and Technology (KSUSTA)',
    'Sokoto State University (SSU)',
    'Zamfara State University (ZAMSU)',
    'Kaduna State University (KASU)',
    'Kano University of Science and Technology (KUST)',
    'Bayero University Kano (BUK)',
    'Northwest University, Kano (NWU)',
    'Osun State University (UNIOSUN)',
    'Ekiti State University (EKSU)',
    'Ondo State University of Science and Technology (OSUSTECH)',
    'Ogun State Institute of Technology (OGITECH)',
    'Olabisi Onabanjo University (OOU)',
    'Lagos State University of Science and Technology (LASUSTECH)',
    'Tai Solarin University of Education (TASUED)',
    'Kwara State University (KWASU)',
    'Anchor University Lagos (AUL)',

    // Private Universities
    'Covenant University',
    'Babcock University',
    'Pan-Atlantic University (PAU)',
    'Afe Babalola University (ABUAD)',
    'Bowen University',
    'Bells University of Technology',
    'Nnamdi Azikiwe University (UNIZIK)',
    'Redeemer\'s University',
    'Landmark University',
    'Lead City University',
    'Caleb University',
    'Benson Idahosa University',
    'Madonna University',
    'American University of Nigeria (AUN)',
    'Caritas University',
    'Godfrey Okoye University',
    'Gregory University',
    'Achievers University',
    'David Umahi Federal University of Health Sciences',
    'Elizade University',
    'Joseph Ayo Babalola University (JABU)',
    'Adeleke University',
    'Augustine University',
    'Ajayi Crowther University',
    'Southwestern University',
    'Wesley University',
    'Oduduwa University',
    'Crawford University',
    'Rhema University',
    'Veritas University',

    // Polytechnics & Colleges
    'Yaba College of Technology (YABATECH)',
    'Federal Polytechnic, Ile-Oluji',
    'Federal Polytechnic, Ado-Ekiti',
    'Federal Polytechnic, Nekede',
    'Lagos City Polytechnic',
    'Moshood Abiola Polytechnic',
    'Gateway Polytechnic',
    'The Polytechnic, Ibadan',
    'Rufus Giwa Polytechnic',
    'Auchi Polytechnic',
];

const LEVEL_OPTIONS = ['100L', '200L', '300L', '400L', '500L', 'Graduate'];

export default function MiniProfileSetup() {
    const { currentUser, userProfile, fetchProfile, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [direction, setDirection] = useState(0);
    const [universitySearch, setUniversitySearch] = useState('');
    const [showUniDropdown, setShowUniDropdown] = useState(false);

    const [formData, setFormData] = useState(() => {
        const saved = localStorage.getItem('onboarding_data');
        return saved ? JSON.parse(saved) : {
            full_name: '',
            age: '',
            university: '',
            level: '',
            interests: [],
            intent: '',
            profile_photos: []
        };
    });

    useEffect(() => {
        localStorage.setItem('onboarding_data', JSON.stringify(formData));
        localStorage.setItem('onboarding_step', currentStep.toString());
    }, [formData, currentStep]);

    useEffect(() => {
        const savedStep = localStorage.getItem('onboarding_step');
        if (savedStep) setCurrentStep(parseInt(savedStep));
    }, []);

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
            const interests = prev.interests.includes(interest)
                ? prev.interests.filter(i => i !== interest)
                : (prev.interests.length < 10 ? [...prev.interests, interest] : prev.interests);
            return { ...prev, interests };
        });
    };

    const handlePhotoUpload = async (e, index) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        try {
            // RAM Management: Image Compression
            const options = {
                maxSizeMB: 0.5,
                maxWidthOrHeight: 1200,
                useWebWorker: true
            };
            const compressedFile = await imageCompression(file, options);

            const { url, error } = await uploadProfilePhoto(compressedFile, currentUser.id, index);
            if (error) throw new Error(error);

            setFormData(prev => {
                const newPhotos = [...(prev.profile_photos || [])];
                newPhotos[index] = url;
                return { ...prev, profile_photos: newPhotos };
            });
            addToast('Photo uploaded successfully! 📸', 'success');
        } catch (err) {
            addToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleFinish = async () => {
        setLoading(true);
        try {
            const parsedAge = parseInt(formData.age, 10);
            if (isNaN(parsedAge) || parsedAge < 18) {
                throw new Error("You must be at least 18 years old to use College Date.");
            }

            const profileData = {
                full_name: formData.full_name,
                age: parsedAge,
                university: formData.university,
                level: formData.level,
                interests: formData.interests,
                attraction_goal: formData.intent,
                profile_photos: formData.profile_photos,
                avatar_url: formData.profile_photos[0],
                email: currentUser.email,
                updated_at: new Date()
            };

            const { error } = await upsertProfile(currentUser.id, profileData);
            if (error) throw new Error(error);

            await fetchProfile(currentUser.id);
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
            addToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const isStepValid = () => {
        switch (currentStep) {
            case 0: return formData.full_name.trim().length > 1 && formData.age >= 18;
            case 1: return formData.university && formData.level;
            case 2: return formData.interests.length >= 3;
            case 3: return formData.intent;
            case 4: return formData.profile_photos && formData.profile_photos.length > 0;
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

    // Filtered universities for autocomplete
    const filteredUnis = UNIVERSITY_OPTIONS.filter(u =>
        u.toLowerCase().includes(universitySearch.toLowerCase())
    );

    return (
        <div className="quiz-onboarding-page">
            <div className="quiz-progress-bar">
                <motion.div
                    className="progress-fill"
                    animate={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
                    transition={{ duration: 0.5 }}
                />
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
                                    <div className="quiz-input-group university-select">
                                        <input
                                            type="text"
                                            placeholder="Search University"
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
                                            </div>
                                        )}
                                    </div>
                                    <div className="level-grid">
                                        {LEVEL_OPTIONS.map(lvl => (
                                            <button
                                                key={lvl}
                                                className={`level-btn ${formData.level === lvl ? 'active' : ''}`}
                                                onClick={() => setFormData(p => ({ ...p, level: lvl }))}
                                            >
                                                {lvl}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {currentStep === 2 && (
                                <div className="mood-bubbles-grid">
                                    {INTERESTS_OPTIONS.map(vibe => (
                                        <button
                                            key={vibe}
                                            className={`mood-bubble ${formData.interests.includes(vibe) ? 'active' : ''}`}
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
                                            <div key={index} className={`quiz-photo-preview ${formData.profile_photos?.[index] ? 'has-photo' : ''}`}>
                                                {formData.profile_photos?.[index] ? (
                                                    <img src={formData.profile_photos[index]} alt={`Preview ${index + 1}`} />
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
                                                    {loading ? '...' : (formData.profile_photos?.[index] ? 'Change' : '+ Add')}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="photo-tip">Tip: Adding more photos gets you more matches! ✨</p>
                                </div>
                            )}

                            {currentStep === 5 && (
                                <div className="success-screen">
                                    <div className="success-emoji">🚀</div>
                                    <p className="success-message">You're all set! Time to find your matches.</p>
                                    <button
                                        className="quiz-final-btn"
                                        onClick={() => navigate('/match')}
                                    >
                                        Let's Go! 🚀
                                    </button>
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
        </div>
    );
}
