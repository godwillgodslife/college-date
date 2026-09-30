import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { getRememberedEmail, getRememberMePreference } from '../lib/authPreferences';
import './Auth.css';

function getSafeRedirectTarget(location) {
    const from = location.state?.from;
    let stateTarget = null;
    if (typeof from === 'object' && from?.pathname) {
        stateTarget = `${from.pathname}${from.search || ''}${from.hash || ''}`;
    } else if (typeof from === 'string') {
        stateTarget = from;
    }
    const queryTarget = new URLSearchParams(location.search).get('redirect');
    const target = stateTarget || queryTarget || '/';

    if (typeof target !== 'string') return '/';
    if (!target.startsWith('/') || target.startsWith('//')) return '/';
    return target;
}

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(true);
    const [enableBiometrics, setEnableBiometrics] = useState(false);

    const {
        login,
        loginWithGoogle,
        error,
        clearError,
        biometricLocked,
        biometricAvailable,
        biometricEnabled,
        currentUser,
        loading: authLoading,
        biometricLabel,
        unlockWithBiometrics
    } = useAuth();
    const { error: showError } = useToast();
    const navigate = useNavigate();
    const location = useLocation();
    const redirectTarget = getSafeRedirectTarget(location);

    useEffect(() => {
        if (!authLoading && currentUser && !biometricLocked) {
            navigate(redirectTarget, { replace: true });
        }
    }, [authLoading, currentUser, biometricLocked, navigate, redirectTarget]);

    useEffect(() => {
        let mounted = true;

        Promise.all([
            getRememberMePreference(),
            getRememberedEmail()
        ]).then(([savedRememberMe, savedEmail]) => {
            if (!mounted) return;
            setRememberMe(savedRememberMe);
            if (savedRememberMe && savedEmail) {
                setEmail(savedEmail);
            }
        }).catch(() => {});

        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        if (biometricAvailable && biometricEnabled) {
            setEnableBiometrics(true);
        }
    }, [biometricAvailable, biometricEnabled]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || !password) {
            showError('Please fill in all fields');
            return;
        }

        setIsLoading(true);
        clearError();

        const { error: loginErr, biometricError } = await login(email, password, {
            rememberMe,
            enableBiometrics: biometricAvailable && enableBiometrics
        });
        setIsLoading(false);

        if (loginErr) {
            showError(loginErr);
        } else {
            if (biometricError) {
                showError(`Signed in, but ${biometricLabel} was not enabled: ${biometricError}`);
            }
            sessionStorage.removeItem('post_auth_redirect');
            navigate(redirectTarget, { replace: true });
        }
    };

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        if (redirectTarget !== '/') {
            sessionStorage.setItem('post_auth_redirect', redirectTarget);
        } else {
            sessionStorage.removeItem('post_auth_redirect');
        }
        const { error: err } = await loginWithGoogle({
            rememberMe,
            enableBiometrics: biometricAvailable && enableBiometrics
        });
        if (err) {
            showError(err);
            setIsLoading(false);
        }
        // OAuth redirects — no need to setIsLoading(false) on success
    };

    const handleBiometricUnlock = async () => {
        setIsLoading(true);
        clearError();
        const { error: unlockError } = await unlockWithBiometrics();
        setIsLoading(false);

        if (unlockError) {
            showError(unlockError);
            return;
        }

        sessionStorage.removeItem('post_auth_redirect');
        navigate(redirectTarget, { replace: true });
    };

    return (
        <div className="auth-page">
            <div className="auth-bg-shapes">
                <div className="auth-shape auth-shape-1"></div>
                <div className="auth-shape auth-shape-2"></div>
                <div className="auth-shape auth-shape-3"></div>
            </div>

            <div className="auth-container">
                <div className="auth-card">
                    <div className="auth-header">
                        <img src="/logo.png" alt="The College Date" className="auth-logo" />
                        <h1 className="auth-title">Welcome Back</h1>
                        <p className="auth-subtitle">Sign in to find your campus match</p>
                    </div>

                    {error && (
                        <div className="auth-error">
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    {biometricLocked ? (
                        <div className="biometric-unlock-card">
                            <div>
                                <strong>Welcome back</strong>
                                <span>Unlock your saved session to continue.</span>
                            </div>
                            <button
                                type="button"
                                className="btn btn-primary btn-block"
                                onClick={handleBiometricUnlock}
                                disabled={isLoading}
                            >
                                {isLoading ? 'Checking...' : `Unlock with ${biometricLabel}`}
                            </button>
                        </div>
                    ) : (biometricAvailable && biometricEnabled) ? (
                        <div className="biometric-unlock-card quick-signin">
                            <div>
                                <strong>1-Tap Sign In Active</strong>
                                <span>Fast login with your enrolled {biometricLabel.toLowerCase()}.</span>
                            </div>
                            <button
                                type="button"
                                className="btn btn-primary btn-block"
                                onClick={handleBiometricUnlock}
                                disabled={isLoading}
                            >
                                {isLoading ? 'Checking...' : `Sign in with ${biometricLabel}`}
                            </button>
                        </div>
                    ) : null}

                    <form onSubmit={handleSubmit} className="auth-form">
                        <div className="form-group">
                            <label htmlFor="email" className="form-label">Email</label>
                            <div className="input-wrapper">
                                <span className="input-icon">📧</span>
                                <input
                                    id="email"
                                    type="email"
                                    className="form-input"
                                    placeholder="you@university.edu"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={isLoading}
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="password" className="form-label">Password</label>
                            <div className="input-wrapper">
                                <span className="input-icon">🔒</span>
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    className="form-input"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={isLoading}
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    className="input-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex={-1}
                                >
                                    {showPassword ? '🙈' : '👁️'}
                                </button>
                            </div>
                        </div>

                        <div className="auth-options-row">
                            <label className="remember-control">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(event) => setRememberMe(event.target.checked)}
                                    disabled={isLoading}
                                />
                                <span>Remember me</span>
                            </label>
                            <Link to="/forgot-password" className="forgot-password-link">
                                Forgot Password?
                            </Link>
                        </div>

                        {window.Capacitor?.isNativePlatform?.() && (
                            <div className="biometric-pref-row">
                                <label className="remember-control biometric-control">
                                    <input
                                        type="checkbox"
                                        checked={enableBiometrics}
                                        onChange={(event) => setEnableBiometrics(event.target.checked)}
                                        disabled={isLoading || !biometricAvailable}
                                    />
                                    <span>Use {biometricLabel} next time</span>
                                </label>
                                {!biometricAvailable && (
                                    <span className="biometric-note" title="Configure fingerprint or face unlock in phone Settings">(Not enrolled in Settings)</span>
                                )}
                            </div>
                        )}

                        <button type="submit" className="btn btn-primary btn-block" disabled={isLoading}>
                            {isLoading ? (
                                <span className="btn-loading">
                                    <span className="btn-spinner"></span>
                                    Signing in...
                                </span>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    <div className="auth-divider">
                        <span>or continue with</span>
                    </div>

                    <div className="social-buttons">
                        <button className="btn btn-social btn-google" onClick={handleGoogleLogin} disabled={isLoading}>
                            <svg viewBox="0 0 24 24" width="20" height="20">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Google
                        </button>

                        {window.Capacitor?.isNativePlatform?.() && (
                            <button
                                type="button"
                                className="btn btn-social btn-biometric"
                                onClick={() => {
                                    if (biometricAvailable && biometricEnabled) {
                                        handleBiometricUnlock();
                                    } else if (biometricAvailable) {
                                        showError(`To enable ${biometricLabel} login, sign in once with your email & password and check "Use ${biometricLabel} next time".`);
                                    } else {
                                        showError(`${biometricLabel} is not enrolled on this phone. Please set up fingerprint or face unlock in your phone's Android Settings.`);
                                    }
                                }}
                                disabled={isLoading}
                            >
                                <span style={{ fontSize: '1.2rem', marginRight: '6px' }}>🔐</span>
                                {biometricLabel}
                            </button>
                        )}
                    </div>

                    <p className="auth-footer">
                        Don't have an account? <Link to="/signup" className="auth-link">Sign Up</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
