import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import OfficialHubModal from '../components/OfficialHubModal';

/**
 * OfficialHubPage
 * Route handler for /official and /official/:category
 * Allows direct deep linking and external sharing of verified tutorials.
 */
export default function OfficialHubPage() {
    const { category } = useParams();
    const navigate = useNavigate();

    const handleClose = () => {
        if (window.history.length > 2) {
            navigate(-1);
        } else {
            navigate('/chat');
        }
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#04070f' }}>
            <OfficialHubModal
                isOpen={true}
                onClose={handleClose}
                initialCategory={category || 'all'}
            />
        </div>
    );
}
