import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

export default function ProtectedRoute({ children }) {
    const { currentUser, loading, profileLoading } = useAuth();
    const location = useLocation();

    if (loading || profileLoading) {
        return (
            <>
                <LoadingSpinner fullScreen />
                {/* Stay matched in the route tree but wait for data */}
                <div style={{ display: 'none' }}>{children}</div>
            </>
        );
    }

    const isPreview = location.search.includes('preview=true') || location.search.includes('demo=true');

    if (!currentUser && !isPreview) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
}
