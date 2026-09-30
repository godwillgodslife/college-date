import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import LoadingSpinner from '../components/LoadingSpinner';
import { consumePendingOAuthPreferences, setRememberedEmail } from '../lib/authPreferences';
import { enableBiometricLoginForUser } from '../services/biometricAuthService';
import { applyStoredReferralCode } from '../services/referralService';
import { recordPolicyAcceptance } from '../services/policyService';
import './Auth.css';

const AUTH_TIMEOUT_MS = 12000;

function getStoredRedirectTarget() {
    const target = sessionStorage.getItem('post_auth_redirect') || '/';
    sessionStorage.removeItem('post_auth_redirect');

    if (!target.startsWith('/') || target.startsWith('//')) return '/';
    return target;
}

function withTimeout(promise, label) {
    let timeoutId;
    const timeout = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new Error(`${label} timed out`));
        }, AUTH_TIMEOUT_MS);
    });

    return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

async function ensureOAuthProfile(session) {
    if (!session?.user) return;

    const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', session.user.id)
        .maybeSingle();

    if (profile) return;

    const meta = session.user.user_metadata || {};
    await supabase.from('profiles').upsert({
        id: session.user.id,
        full_name: meta.full_name || meta.name || '',
        email: session.user.email || '',
        avatar_url: meta.avatar_url || meta.picture || '',
    }, { onConflict: 'id' });

    // Record initial policy acceptance for new OAuth user
    recordPolicyAcceptance('terms', '2.0', { source: 'oauth_signup' }).catch(() => {});
    recordPolicyAcceptance('privacy', '2.0', { source: 'oauth_signup' }).catch(() => {});
}

async function applyOAuthPreferences(session) {
    if (!session?.user) return;

    const preferences = await consumePendingOAuthPreferences();
    await setRememberedEmail(session.user.email || '', preferences.rememberMe);

    if (preferences.enableBiometrics) {
        const result = await enableBiometricLoginForUser(session.user.id);
        if (result.error) {
            console.warn('Biometric login setup skipped:', result.error);
        }
    }
}

/**
 * AuthCallback handles the OAuth redirect.
 * Supabase will redirect here after Google/Facebook login.
 * We extract the session and redirect to the dashboard.
 */
export default function AuthCallback() {
    const navigate = useNavigate();
    const [status, setStatus] = useState('Completing sign in...');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        async function handleCallback() {
            try {
                setStatus('Checking sign in response...');
                const params = new URLSearchParams(window.location.search);
                const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
                const authError = params.get('error_description') || hashParams.get('error_description');

                if (authError) {
                    throw new Error(authError);
                }

                const code = params.get('code');
                const accessToken = hashParams.get('access_token');
                const refreshToken = hashParams.get('refresh_token');
                let sessionError = null;

                if (code) {
                    setStatus('Finishing secure sign in...');
                    const { error: exchangeError } = await withTimeout(
                        supabase.auth.exchangeCodeForSession(code),
                        'OAuth session exchange'
                    );
                    sessionError = exchangeError;
                } else if (accessToken && refreshToken) {
                    setStatus('Saving your sign in...');
                    const { error: setSessionError } = await withTimeout(
                        supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken,
                        }),
                        'OAuth token session save'
                    );
                    sessionError = setSessionError;
                }

                setStatus('Opening The College Date...');
                const { data: { session }, error } = await withTimeout(
                    supabase.auth.getSession(),
                    'OAuth session lookup'
                );

                if (sessionError || error) {
                    console.error('Auth callback error:', sessionError?.message || error?.message);
                    throw new Error(sessionError?.message || error?.message);
                }

                if (!code && !accessToken && !session?.user) {
                    throw new Error('No sign-in session was returned. Please try Google login again.');
                }

                if (!session?.user && (code || accessToken)) {
                    throw new Error('Sign-in completed, but no user session was saved.');
                }

                if (session?.user) {
                    await applyOAuthPreferences(session);
                    navigate(getStoredRedirectTarget(), { replace: true });
                    setTimeout(() => {
                        ensureOAuthProfile(session)
                            .then(() => applyStoredReferralCode())
                            .catch((profileError) => {
                                console.warn('OAuth profile/referral repair skipped:', profileError.message);
                            });
                    }, 0);
                    return;
                }

                navigate('/login', { replace: true });
            } catch (err) {
                console.error('Auth callback exception:', err);
                setErrorMessage(err.message || 'Google sign-in could not be completed.');
                setStatus('Sign in needs another try');
            }
        }

        handleCallback();
    }, [navigate]);

    if (errorMessage) {
        return (
            <div className="auth-page">
                <div className="auth-card">
                    <h2>Google sign-in did not finish</h2>
                    <p>{errorMessage}</p>
                    <button className="btn btn-primary" onClick={() => navigate('/login', { replace: true })}>
                        Try again
                    </button>
                </div>
            </div>
        );
    }

    return <LoadingSpinner fullScreen text={status} />;
}
