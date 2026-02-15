import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import LoadingSpinner from '../components/LoadingSpinner';

/**
 * AuthCallback handles the OAuth redirect.
 * Supabase will redirect here after Google/Facebook login.
 * We extract the session and redirect to the dashboard.
 */
export default function AuthCallback() {
    const navigate = useNavigate();

    useEffect(() => {
        async function handleCallback() {
            try {
                // Supabase auto-detects the auth tokens in the URL fragment
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) {
                    console.error('Auth callback error:', error.message);
                    navigate('/login', { replace: true });
                    return;
                }

                if (session?.user) {
                    // Check if the user has a profile, if not create a basic one
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('id', session.user.id)
                        .single();

                    if (!profile) {
                        // Create basic profile from OAuth metadata
                        const meta = session.user.user_metadata || {};
                        await supabase.from('profiles').upsert({
                            id: session.user.id,
                            full_name: meta.full_name || meta.name || '',
                            email: session.user.email || '',
                            avatar_url: meta.avatar_url || meta.picture || '',
                        }, { onConflict: 'id' });
                    }

                    navigate('/dashboard', { replace: true });
                } else {
                    navigate('/login', { replace: true });
                }
            } catch (err) {
                console.error('Auth callback exception:', err);
                navigate('/login', { replace: true });
            }
        }

        handleCallback();
    }, [navigate]);

    return <LoadingSpinner fullScreen text="Completing sign in..." />;
}
