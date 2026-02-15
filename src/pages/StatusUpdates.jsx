import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getRecentStatuses, getHiddenContentCounts } from '../services/statusService';
import StatusInput from '../components/StatusInput';
import StatusFeed from '../components/StatusFeed';
import { useToast } from '../components/Toast';
import './StatusUpdates.css';

export default function StatusUpdates() {
    const { currentUser } = useAuth();
    const { addToast } = useToast();

    const [statuses, setStatuses] = useState([]);
    const [hiddenCount, setHiddenCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const loadStatuses = useCallback(async () => {
        setLoading(true);
        // 1. Load visible statuses
        const { data, error } = await getRecentStatuses();
        if (error) {
            console.error('Failed to load statuses:', error);
        } else {
            setStatuses(data || []);
        }

        // 2. Load hidden counts for FOMO
        if (currentUser) {
            const { data: counts } = await getHiddenContentCounts(currentUser.id);
            setHiddenCount(counts?.hidden_statuses || 0);
        }

        setLoading(false);
    }, [currentUser]);

    useEffect(() => {
        loadStatuses();
    }, [loadStatuses]);

    const handleStatusPosted = () => {
        loadStatuses();
    };

    return (
        <div className="status-page">
            <div className="status-header-section">
                <h1>Status Updates</h1>
                <p>Share moments that disappear after 24 hours.</p>
            </div>

            <div className="status-content-wrapper">
                <StatusInput onStatusPosted={handleStatusPosted} />

                <h2 className="section-title">Recent Updates</h2>
                <StatusFeed statuses={statuses} loading={loading} hiddenCount={hiddenCount} />
            </div>
        </div>
    );
}
