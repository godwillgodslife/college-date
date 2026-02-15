import './LoadingSpinner.css';

export default function LoadingSpinner({ fullScreen = false, size = 'medium', text = '' }) {
    const sizeClass = `spinner-${size}`;

    if (fullScreen) {
        return (
            <div className="spinner-fullscreen">
                <div className="spinner-container">
                    <div className={`spinner ${sizeClass}`}>
                        <div className="spinner-ring"></div>
                        <div className="spinner-ring"></div>
                        <div className="spinner-ring"></div>
                    </div>
                    {text && <p className="spinner-text">{text}</p>}
                    <p className="spinner-brand">College Date</p>
                </div>
            </div>
        );
    }

    return (
        <div className="spinner-inline">
            <div className={`spinner ${sizeClass}`}>
                <div className="spinner-ring"></div>
                <div className="spinner-ring"></div>
                <div className="spinner-ring"></div>
            </div>
            {text && <p className="spinner-text">{text}</p>}
        </div>
    );
}
