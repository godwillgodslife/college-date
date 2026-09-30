import { motion } from 'framer-motion';
import './StreakIndicator.css';

export default function StreakIndicator({ streak, badge, onClick }) {
    if (!streak || streak <= 0) return null;

    return (
        <motion.div
            className="streak-indicator-floating"
            initial={{ scale: 0, x: 50 }}
            animate={{ scale: 1, x: 0 }}
            whileHover={{ scale: 1.1 }}
            onClick={onClick}
            style={{ cursor: onClick ? 'pointer' : 'default' }}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            aria-label={`Score streak: ${streak} days`}
        >
            <div className="streak-fire-icon">
                🔥
                <span className="streak-number">{streak}</span>
            </div>
            <div className="streak-badge-tooltip">
                {badge || 'Score Streak'}
            </div>
        </motion.div>
    );
}
