import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import './Auth.css';

const RESET_TIMEOUT_MS = 12000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COOLDOWN_KEY = 'tcd_reset_cooldown_until';

function withTimeout(promise, label) {
    let timeoutId;
    const timeout = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new Error(`${label} timed out. Please check your network connection.`));
        }, RESET_TIMEOUT_MS);
    });

    return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { updatePassword, verifyPasswordResetOtp, sendPasswordResetEmail, clearError, logout } = useAuth();
    const { success, error: showError, info } = useToast();

    const [ready, setReady] = useState(false);
    const [status, setStatus] = useState('Verifying reset credentials...');
    const [linkExpired, setLinkExpired] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // OTP fallback form state
    const [email, setEmail] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [cooldown, setCooldown] = useState(0);
    const timerRef = useRef(null);

    // Password reset form state
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [updated, setUpdated] = useState(false);

    // Hydrate email and active cooldown
    useEffect(() => {
        let mounted = true;

        const queryEmail = searchParams.get('email');
        if (queryEmail) {
            setEmail(queryEmail.trim());
        } else {
            const lastEmail = sessionStorage.getItem('tcd_last_reset_email');
            if (lastEmail) setEmail(lastEmail);
        }

        const queryToken = searchParams.get('token') || searchParams.get('code');
        if (queryToken && queryToken.length <= 10) {
            setOtpCode(queryToken.trim());
        }

        const savedCooldownUntil = sessionStorage.getItem(COOLDOWN_KEY);
        if (savedCooldownUntil) {
            const remaining = Math.max(0, Math.ceil((parseInt(savedCooldownUntil, 10) - Date.now()) / 1000));
            if (remaining > 0) {
                setCooldown(remaining);
            } else {
                sessionStorage.removeItem(COOLDOWN_KEY);
            }
        }

        return () => {
            mounted = false;
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [searchParams]);

    // Tick cooldown countdown
    useEffect(() => {
        if (cooldown > 0) {
            timerRef.current = setInterval(() => {
                setCooldown((prev) => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        sessionStorage.removeItem(COOLDOWN_KEY);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => clearInterval(timerRef.current);
        }
    }, [cooldown]);

    const startCooldown = (seconds = 60) => {
        const until = Date.now() + seconds * 1000;
        sessionStorage.setItem(COOLDOWN_KEY, String(until));
        setCooldown(seconds);
    };

    useEffect(() => {
        let active = true;

        // 1. Listen for Supabase PASSWORD_RECOVERY auth event
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (!active) return;
            if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session?.user)) {
                setReady(true);
                setLinkExpired(false);
                setStatus('');
                setErrorMessage('');
            }
        });

        // 2. Parse URL parameters and check existing session
        async function prepareResetSession() {
            try {
                // If user came here via verified OTP code on /forgot-password
                if (searchParams.get('verified') === '1') {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session?.user && active) {
                        setReady(true);
                        setLinkExpired(false);
                        setStatus('');
                        setErrorMessage('');
                        return;
                    }
                }

                // Check existing active recovery session
                const { data: { session: existingSession } } = await supabase.auth.getSession();
                if (existingSession?.user && active) {
                    setReady(true);
                    setLinkExpired(false);
                    setStatus('');
                    setErrorMessage('');
                    return;
                }

                const params = new URLSearchParams(window.location.search);
                const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
                const authError = params.get('error_description')
                    || hashParams.get('error_description')
                    || params.get('error')
                    || hashParams.get('error');

                if (authError) {
                    console.warn('[Auth] Detected auth error in URL:', authError);
                    if (active) {
                        setLinkExpired(true);
                        setErrorMessage(authError);
                        setReady(false);
                    }
                    return;
                }

                const code = params.get('code');
                const accessToken = hashParams.get('access_token');
                const refreshToken = hashParams.get('refresh_token');

                if (code) {
                    if (active) setStatus('Establishing secure recovery session...');
                    const { error: exchangeErr } = await withTimeout(
                        supabase.auth.exchangeCodeForSession(code),
                        'Password reset session exchange'
                    );
                    if (exchangeErr) {
                        console.warn('[Auth] Code exchange error, falling back to OTP entry:', exchangeErr);
                        if (active) {
                            setLinkExpired(true);
                            setErrorMessage(exchangeErr.message || 'This reset link has expired or was already used.');
                            setReady(false);
                        }
                        return;
                    }
                } else if (accessToken && refreshToken) {
                    if (active) setStatus('Saving recovery credentials...');
                    const { error: setErr } = await withTimeout(
                        supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken,
                        }),
                        'Password reset token save'
                    );
                    if (setErr) {
                        console.warn('[Auth] Token save error:', setErr);
                        if (active) {
                            setLinkExpired(true);
                            setErrorMessage(setErr.message);
                            setReady(false);
                        }
                        return;
                    }
                }

                const { data: { session }, error: lookupErr } = await withTimeout(
                    supabase.auth.getSession(),
                    'Password reset session lookup'
                );

                if (lookupErr || !session?.user) {
                    if (active) {
                        setLinkExpired(true);
                        setErrorMessage('This link has expired or was already used. Enter your 6-digit code below:');
                        setReady(false);
                    }
                    return;
                }

                if (active) {
                    setReady(true);
                    setLinkExpired(false);
                    setStatus('');
                    setErrorMessage('');
                }
            } catch (error) {
                console.error('[Auth] Password reset link error:', error);
                if (active) {
                    setLinkExpired(true);
                    setErrorMessage(error.message || 'This reset link is invalid or expired.');
                    setReady(false);
                }
            }
        }

        prepareResetSession();

        return () => {
            active = false;
            subscription?.unsubscribe();
        };
    }, [searchParams]);

    const handleVerifyOtp = async (event) => {
        event.preventDefault();
        const trimmedEmail = email.trim();
        const cleanCode = otpCode.trim().replace(/\s+/g, '');

        if (!trimmedEmail) {
            showError('Please enter your account email address.');
            return;
        }

        if (!EMAIL_REGEX.test(trimmedEmail)) {
            showError('Please enter a valid email address.');
            return;
        }

        if (!cleanCode || cleanCode.length < 6) {
            showError('Please enter the 6-digit verification code from your email.');
            return;
        }

        setIsVerifyingOtp(true);
        clearError();

        try {
            const { data, error: otpError } = await verifyPasswordResetOtp(trimmedEmail, cleanCode);
            setIsVerifyingOtp(false);

            if (otpError) {
                const errLower = String(otpError).toLowerCase();
                if (errLower.includes('expired') || errLower.includes('invalid')) {
                    showError('This code is invalid or has expired. Please check your latest email or request a fresh code.');
                } else {
                    showError(otpError);
                }
                return;
            }

            if (data?.session || data?.user) {
                setReady(true);
                setLinkExpired(false);
                setErrorMessage('');
                success('Verification code accepted! Enter your new password below.');
            } else {
                showError('Could not establish session. Please try again.');
            }
        } catch (err) {
            setIsVerifyingOtp(false);
            showError(err.message || 'Failed to verify recovery code.');
        }
    };

    const handleResendCode = async () => {
        const trimmedEmail = email.trim();

        if (!trimmedEmail) {
            showError('Enter your account email address first.');
            return;
        }

        if (!EMAIL_REGEX.test(trimmedEmail)) {
            showError('Please enter a valid email address.');
            return;
        }

        if (cooldown > 0) {
            info(`Please wait ${cooldown}s before requesting another code.`);
            return;
        }

        setIsResending(true);
        clearError();

        try {
            const { error: resetError } = await sendPasswordResetEmail(trimmedEmail);
            setIsResending(false);

            if (resetError) {
                const errLower = String(resetError).toLowerCase();
                if (errLower.includes('rate limit') || errLower.includes('too many requests')) {
                    showError('Too many attempts. Please wait 90 seconds.');
                    startCooldown(90);
                } else {
                    showError(resetError);
                }
                return;
            }

            startCooldown(60);
            success('Fresh recovery code sent to your email.');
        } catch (err) {
            setIsResending(false);
            showError(err.message || 'Unable to resend code.');
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        clearError();

        if (password.length < 8) {
            showError('Password must be at least 8 characters long.');
            return;
        }

        if (password !== confirmPassword) {
            showError('The passwords entered do not match.');
            return;
        }

        setIsSaving(true);
        try {
            const { error } = await updatePassword(password);
            setIsSaving(false);

            if (error) {
                showError(error);
                return;
            }

            setUpdated(true);
            success('Your password has been successfully updated!');
        } catch (err) {
            setIsSaving(false);
            showError(err.message || 'Could not update password. Please try again.');
        }
    };

    const handleContinueToLogin = async () => {
        try {
            await logout();
        } catch (_) {}
        navigate('/login', { replace: true });
    };

    // If link expired or invalid, show the interactive code entry fallback (Zero dead-ends!)
    if (linkExpired && !ready) {
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
                            <h1 className="auth-title">Verify Reset Code</h1>
                            <p className="auth-subtitle">
                                Enter the 6-digit code sent to your email to set a new password.
                            </p>
                        </div>

                        <div className="auth-alert-warning">
                            <span className="auth-alert-warning-icon">⚠️</span>
                            <div>
                                <strong>Direct link expired or already opened</strong>
                                <div style={{ marginTop: '0.2rem', opacity: 0.9 }}>
                                    Email security scanners may have inspected this single-use link. Don&apos;t worry — you can enter your 6-digit code below:
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleVerifyOtp} className="auth-form">
                            <div className="form-group">
                                <label htmlFor="expired-email" className="form-label">Student Email</label>
                                <div className="input-wrapper">
                                    <span className="input-icon">@</span>
                                    <input
                                        id="expired-email"
                                        type="email"
                                        className="form-input"
                                        placeholder="you@university.edu"
                                        value={email}
                                        onChange={(event) => setEmail(event.target.value)}
                                        disabled={isVerifyingOtp}
                                        autoComplete="email"
                                        autoCapitalize="none"
                                        spellCheck="false"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="expired-otp-code" className="form-label">6-Digit Verification Code</label>
                                <div className="input-wrapper">
                                    <input
                                        id="expired-otp-code"
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        maxLength={10}
                                        className="form-input otp-code-input"
                                        placeholder="123456"
                                        value={otpCode}
                                        onChange={(event) => setOtpCode(event.target.value)}
                                        disabled={isVerifyingOtp}
                                        autoComplete="one-time-code"
                                        autoFocus
                                        required
                                    />
                                </div>
                                <div className="otp-hint">
                                    Check your inbox or spam folder for the latest 6-digit code.
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                className="btn btn-primary btn-block" 
                                disabled={isVerifyingOtp || !otpCode.trim()}
                            >
                                {isVerifyingOtp ? 'Verifying Code...' : 'Verify Code & Set Password'}
                            </button>

                            <div className="auth-secondary-actions">
                                <button
                                    type="button"
                                    className="btn-ghost"
                                    onClick={handleResendCode}
                                    disabled={isResending || cooldown > 0}
                                >
                                    {cooldown > 0 ? `Resend Fresh Code in ${cooldown}s` : 'Send Fresh Recovery Code'}
                                </button>
                                <Link 
                                    to="/forgot-password" 
                                    className="auth-toggle-link"
                                    style={{ textAlign: 'center', marginTop: '0.25rem' }}
                                >
                                    Start Over from Forgot Password
                                </Link>
                            </div>
                        </form>

                        <p className="auth-footer" style={{ marginTop: '1.5rem' }}>
                            <Link to="/login" className="auth-link">Back to Sign In</Link>
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (!ready) {
        return <LoadingSpinner fullScreen text={status} />;
    }

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
                        <h1 className="auth-title">Create New Password</h1>
                        <p className="auth-subtitle">Ensure your account is protected with a strong password.</p>
                    </div>

                    {updated ? (
                        <div className="auth-success-stack">
                            <div className="auth-success" style={{ marginBottom: '1.25rem' }}>
                                🎉 Your password has been updated successfully! You can now continue into College Date.
                            </div>
                            <button
                                type="button"
                                className="btn btn-primary btn-block"
                                onClick={() => navigate('/match', { replace: true })}
                            >
                                Continue to App
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary btn-block"
                                style={{ marginTop: '0.75rem' }}
                                onClick={handleContinueToLogin}
                            >
                                Sign In Again
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="auth-form">
                            <div className="form-group">
                                <label htmlFor="new-password" className="form-label">New Password</label>
                                <div className="input-wrapper">
                                    <span className="input-icon">🔒</span>
                                    <input
                                        id="new-password"
                                        type="password"
                                        className="form-input"
                                        placeholder="Minimum 8 characters"
                                        value={password}
                                        onChange={(event) => setPassword(event.target.value)}
                                        disabled={isSaving}
                                        autoComplete="new-password"
                                        minLength={8}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="confirm-password" className="form-label">Confirm New Password</label>
                                <div className="input-wrapper">
                                    <span className="input-icon">🔒</span>
                                    <input
                                        id="confirm-password"
                                        type="password"
                                        className="form-input"
                                        placeholder="Re-enter new password"
                                        value={confirmPassword}
                                        onChange={(event) => setConfirmPassword(event.target.value)}
                                        disabled={isSaving}
                                        autoComplete="new-password"
                                        minLength={8}
                                        required
                                    />
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                className="btn btn-primary btn-block" 
                                disabled={isSaving}
                            >
                                {isSaving ? 'Updating Password...' : 'Save New Password'}
                            </button>

                            <p className="auth-footer">
                                <Link to="/login" className="auth-link">Cancel & Return to Sign In</Link>
                            </p>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
