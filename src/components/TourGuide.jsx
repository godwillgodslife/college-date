import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isUserEligibleForTour } from '../utils/tourEligibility';
import './TourGuide.css';

export { isUserEligibleForTour };

export default function TourGuide() {
    const [step, setStep] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const location = useLocation();
    const { currentUser, userProfile, updateProfile } = useAuth();
    const [isSaving, setIsSaving] = useState(false);
    const syncedTourRef = useRef(false);

    useEffect(() => {
        if (!currentUser || !userProfile) return;

        const isEligibleRoute = location.pathname === '/match' || location.pathname === '/dashboard';
        if (!isEligibleRoute) return;

        const eligible = isUserEligibleForTour(userProfile, currentUser);

        if (!eligible) {
            // Silently sync local flags and database profile if needed so it is permanently cached
            try {
                if (typeof window !== 'undefined' && window.localStorage) {
                    if (window.localStorage.getItem(`hasSeenAppTour_${currentUser.id}`) !== 'true') {
                        window.localStorage.setItem('hasSeenAppTour', 'true');
                        window.localStorage.setItem(`hasSeenAppTour_${currentUser.id}`, 'true');
                    }
                }
                if (userProfile.has_seen_tour !== true && typeof updateProfile === 'function' && !syncedTourRef.current) {
                    syncedTourRef.current = true;
                    updateProfile(currentUser.id, { has_seen_tour: true }).catch(() => {});
                }
            } catch {
                // Ignore storage/sync errors
            }
            setIsVisible(false);
            return;
        }

        setIsVisible(true);
    }, [location.pathname, userProfile, currentUser, updateProfile]);

    useEffect(() => {
        if (typeof document === 'undefined') return;
        if (isVisible) {
            document.body.classList.add('has-modal-open');
        } else {
            document.body.classList.remove('has-modal-open');
        }
        return () => {
            document.body.classList.remove('has-modal-open');
        };
    }, [isVisible]);

    const handleNext = () => {
        setStep(prev => prev + 1);
    };

    const handleFinish = async () => {
        setIsSaving(true);
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.setItem('hasSeenAppTour', 'true');
                if (currentUser?.id) {
                    window.localStorage.setItem(`hasSeenAppTour_${currentUser.id}`, 'true');
                }
            }

            if (currentUser && typeof updateProfile === 'function') {
                // Intentionally save it to the DB so it persists across device logouts
                await updateProfile(currentUser.id, { has_seen_tour: true });
            }
        } catch (err) {
            console.warn('[TourGuide] Could not save tour status:', err);
        } finally {
            setIsVisible(false);
            setIsSaving(false);
        }
    };

    if (!isVisible) return null;

    const tourSteps = [
        {
            title: "Welcome to College Date! 👋",
            text: "Ready to find your match? Here's a quick tour.",
            target: "center"
        },
        {
            title: "Discover 🃏",
            text: "Swipe Right to Like, Left to Pass. If they like you back, it's a Match!",
            target: "bottom-center" // Pointing to nav (abstractly)
        },
        {
            title: "Confessions 🤫",
            text: "Read anonymous secrets from your campus. Spicy!",
            target: "top-right"
        },
        {
            title: "Vibe Check ✨",
            text: "Check the Leaderboard to see who's trending.",
            target: "top-left"
        }
    ];

    const currentStepData = tourSteps[step];

    const content = (
        <div className="tour-overlay" onClick={handleFinish}>
            <div className={`tour-card ${currentStepData.target}`} onClick={(e) => e.stopPropagation()}>
                <div className="tour-header">
                    <h3>{currentStepData.title}</h3>
                    <button className="tour-close" onClick={handleFinish} aria-label="Close tour">✕</button>
                </div>
                <p className="tour-body">{currentStepData.text}</p>
                <div className="tour-footer">
                    <span className="tour-dots">
                        {tourSteps.map((_, i) => (
                            <span key={i} className={`tour-dot ${i === step ? 'active' : ''}`} />
                        ))}
                    </span>
                    {step < tourSteps.length - 1 ? (
                        <button className="btn-tour-next" onClick={handleNext}>Next</button>
                    ) : (
                        <button className="btn-tour-finish" onClick={handleFinish} disabled={isSaving}>
                            {isSaving ? 'Saving...' : "Let's Go!"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );

    if (typeof document !== 'undefined' && document.body) {
        return createPortal(content, document.body);
    }
    return content;
}
