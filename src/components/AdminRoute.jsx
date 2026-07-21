import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { hasLocalAdminAccess } from '../utils/adminAccess';
import LoadingSpinner from './LoadingSpinner';

export default function AdminRoute({ children }) {
    const { currentUser, loading, profileLoading } = useAuth();
    const [adminState, setAdminState] = useState({ checking: true, allowed: false });
    const hasLocalAccess = hasLocalAdminAccess(currentUser);

    useEffect(() => {
        let isMounted = true;

        async function checkAdminAccess() {
            if (loading || profileLoading || !currentUser) {
                setAdminState({ checking: false, allowed: false });
                return;
            }

            if (hasLocalAccess) {
                setAdminState({ checking: false, allowed: true });
                return;
            }

            setAdminState({ checking: true, allowed: false });

            const { data, error } = await supabase.rpc('is_app_admin');

            if (!isMounted) return;

            setAdminState({
                checking: false,
                allowed: !error && data === true
            });
        }

        checkAdminAccess();

        return () => {
            isMounted = false;
        };
    }, [currentUser, loading, profileLoading, hasLocalAccess]);

    if (loading || profileLoading || (currentUser && adminState.checking)) {
        return <LoadingSpinner fullScreen text="Checking credentials..." />;
    }

    if (!currentUser) {
        return <Navigate to="/login" replace state={{ from: { pathname: '/admin' } }} />;
    }

    if (!adminState.allowed) {
        return <Navigate to="/" replace />;
    }

    return children;
}
