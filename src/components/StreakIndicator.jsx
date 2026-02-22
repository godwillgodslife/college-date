import { motion } from 'framer-motion';
import './StreakIndicator.css';

export default function StreakIndicator({ streak, badge }) {
    if (!streak || streak <= 0) return null;

    return (
        <motion.div
            className="streak-indicator-floating"
            initial={{ scale: 0, x: 50 }}
            animate={{ scale: 1, x: 0 }}
            whileHover={{ scale: 1.1 }}
        >
            <div className="streak-fire-icon">
                🔥
                <span className="streak-number">{streak}</span>
            </div>
            <div className="streak-badge-tooltip">
                {badge || 'Regular'}
            </div>
        </motion.div>
    );
}
