import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import './ViewerTeaser.css';

export default function ViewerTeaser({ count }) {
    const navigate = useNavigate();

    if (count === 0) return null;

    return (
        <motion.div
            className="viewer-teaser-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => navigate('/viewers')}
        >
            <div className="teaser-content">
                <div className="viewer-avatars-blur">
                    <div className="blur-dot dot-1"></div>
                    <div className="blur-dot dot-2"></div>
                    <div className="blur-dot dot-3"></div>
                </div>
                <div className="teaser-text">
                    <span className="teaser-highlight">👀 {count} people</span> viewed your profile today
                </div>
            </div>
            <div className="teaser-arrow">→</div>
        </motion.div>
    );
}
