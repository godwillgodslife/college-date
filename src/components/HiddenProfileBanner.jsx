import { useNavigate } from 'react-router-dom';
import './HiddenProfileBanner.css';

/**
 * HiddenProfileBanner
 * Shown on Explore / Match pages when the current user has no photos.
 * Prompts them to upload a photo so they appear in Discovery.
 */
export default function HiddenProfileBanner() {
    const navigate = useNavigate();

    return (
        <div className="hidden-profile-banner">
            <div className="hidden-profile-inner">
                <div className="hidden-profile-icon">🕶️</div>
                <h2 className="hidden-profile-title">You're Currently Invisible!</h2>
                <p className="hidden-profile-body">
                    Add a beautiful photo to your profile to appear in Discovery and start matching.
                </p>
                <button
                    className="hidden-profile-cta"
                    onClick={() => navigate('/profile/edit')}
                >
                    📸 Upload a Photo — Go Live
                </button>
                <p className="hidden-profile-note">
                    It only takes a few seconds!
                </p>
            </div>
        </div>
    );
}
