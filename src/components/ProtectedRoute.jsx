import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

export default function ProtectedRoute({ children }) {
    const { currentUser, loading, profileLoading } = useAuth();

    if (loading || profileLoading) {
        return (
            <>
                <LoadingSpinner fullScreen />
                {/* Stay matched in the route tree but wait for data */}
                <div style={{ display: 'none' }}>{children}</div>
            </>
        );
    }

    if (!currentUser) {
        return <Navigate to="/login" replace />;
    }

    return children;
}
