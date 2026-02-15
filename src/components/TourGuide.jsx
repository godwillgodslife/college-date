import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import './TourGuide.css';

export default function TourGuide() {
    const [step, setStep] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const location = useLocation();

    useEffect(() => {
        // Only show tour on Dashboard/Discover if not seen before
        const hasSeenTour = localStorage.getItem('hasSeenAppTour');
        if (!hasSeenTour && (location.pathname === '/discover' || location.pathname === '/dashboard')) {
            setIsVisible(true);
        }
    }, [location.pathname]);

    const handleNext = () => {
        setStep(prev => prev + 1);
    };

    const handleFinish = () => {
        setIsVisible(false);
        localStorage.setItem('hasSeenAppTour', 'true');
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

    return (
        <div className="tour-overlay">
            <div className={`tour-card ${currentStepData.target}`}>
                <div className="tour-header">
                    <h3>{currentStepData.title}</h3>
                    <button className="tour-close" onClick={handleFinish}>✕</button>
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
                        <button className="btn-tour-finish" onClick={handleFinish}>Let's Go!</button>
                    )}
                </div>
            </div>
        </div>
    );
}
