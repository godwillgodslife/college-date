import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRecentStatuses } from '../services/statusService';
import OptimizedImage from './OptimizedImage';
import './StatusBubbles.css';

export default function StatusBubbles() {
    const [statuses, setStatuses] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        loadStatuses();
    }, []);

    const loadStatuses = async () => {
        const { data } = await getRecentStatuses();
        // Group by user to show unique bubbles
        const uniqueStatuses = [];
        const seenUsers = new Set();

        if (data) {
            data.forEach(status => {
                if (!seenUsers.has(status.user_id)) {
                    seenUsers.add(status.user_id);
                    uniqueStatuses.push(status);
                }
            });
        }
        setStatuses(uniqueStatuses);
        setLoading(false);
    };

    if (loading || statuses.length === 0) return null;

    return (
        <div className="status-bubbles-container">
            <div className="status-bubbles-scroll">
                <div className="status-bubble add-status" onClick={() => navigate('/status')}>
                    <div className="bubble-ring">
                        <span className="plus-icon">+</span>
                    </div>
                    <span className="bubble-label">You</span>
                </div>

                {statuses.map(status => (
                    <div
                        key={status.id}
                        className="status-bubble"
                        onClick={() => navigate('/status')}
                    >
                        <div className="bubble-ring">
                            <OptimizedImage
                                src={status.user?.avatar_url || 'https://via.placeholder.com/60'}
                                alt={status.user?.full_name}
                                width={60}
                            />
                        </div>
                        <span className="bubble-label">
                            {(status.user?.full_name || 'User').split(' ')[0]}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
