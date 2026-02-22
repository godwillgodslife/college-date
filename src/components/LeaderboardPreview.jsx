import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import './LeaderboardPreview.css';

export default function LeaderboardPreview() {
    const [topUsers, setTopUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        loadTopUsers();
    }, []);

    const loadTopUsers = async () => {
        const { data } = await supabase
            .from('leaderboard_most_wanted')
            .select('*')
            .limit(3);

        setTopUsers(data || []);
        setLoading(false);
    };

    if (loading || topUsers.length === 0) return null;

    return (
        <div className="leaderboard-preview-container" onClick={() => navigate('/leaderboard')}>
            <div className="preview-header">
                <h3>🔥 Campus Stars</h3>
                <span className="view-all">View All →</span>
            </div>

            <div className="preview-list">
                {topUsers.map((user, index) => (
                    <div key={user.id} className="preview-user">
                        <div className="rank-badge">{index + 1}</div>
                        <img src={user.avatar_url || 'https://via.placeholder.com/40'} alt={user.full_name} />
                        <span className="user-name">{user.full_name?.split(' ')[0]}</span>
                    </div>
                ))}
            </div>

            <p className="preview-footer">
                Join the elite. Increase your visibility score!
            </p>
        </div>
    );
}
