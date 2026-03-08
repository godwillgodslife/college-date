import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

export default function AdminRoute({ children }) {
    const { currentUser, userProfile, loading, profileLoading } = useAuth();

    if (loading || profileLoading) {
        return <LoadingSpinner fullScreen text="Checking credentials..." />;
    }

    if (!currentUser) {
        return <Navigate to="/login" replace />;
    }

    // Check if user has the admin claim in their metadata
    // We check raw_user_meta_data directly from the auth user object
    const isAdmin = currentUser.user_metadata?.is_admin === true;

    if (!isAdmin) {
        // Aggressively redirect non-admins back to the home page
        return <Navigate to="/" replace />;
    }

    return children;
}
