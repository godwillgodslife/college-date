import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { getRememberedEmail } from '../lib/authPreferences';
import './Auth.css';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COOLDOWN_KEY = 'tcd_reset_cooldown_until';

export default function ForgotPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [mode, setMode] = useState('request'); // 'request' | 'verify'
    const [isLoading, setIsLoading] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [cooldown, setCooldown] = useState(0);
    const { sendPasswordResetEmail, verifyPasswordResetOtp, clearError, error } = useAuth();
    const { success, error: showError, info } = useToast();
    const timerRef = useRef(null);

    // Hydrate remembered email & active cooldown on mount
    useEffect(() => {
        let mounted = true;

        const queryEmail = searchParams.get('email');
        const queryStep = searchParams.get('step');
        const queryToken = searchParams.get('token') || searchParams.get('code');

        if (queryEmail) {
            setEmail(queryEmail.trim());
        } else {
            const lastEmail = sessionStorage.getItem('tcd_last_reset_email');
            if (lastEmail) {
                setEmail(lastEmail);
            } else {
                getRememberedEmail().then((savedEmail) => {
                    if (mounted && savedEmail) setEmail(savedEmail);
                }).catch(() => {});
            }
        }

        if (queryToken) {
            setOtpCode(queryToken.trim());
            setMode('verify');
        } else if (queryStep === 'verify') {
            setMode('verify');
        }

        // Check active cooldown
        const savedCooldownUntil = sessionStorage.getItem(COOLDOWN_KEY);
        if (savedCooldownUntil) {
            const remaining = Math.max(0, Math.ceil((parseInt(savedCooldownUntil, 10) - Date.now()) / 1000));
            if (remaining > 0) {
                setCooldown(remaining);
                setMode('verify');
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

    const handleSendReset = async (event) => {
        if (event) event.preventDefault();
        const trimmedEmail = email.trim();

        if (!trimmedEmail) {
            showError('Enter the email address on your account.');
            return;
        }

        if (!EMAIL_REGEX.test(trimmedEmail)) {
            showError('Please enter a valid email address (e.g. you@university.edu).');
            return;
        }

        if (cooldown > 0) {
            info(`Please wait ${cooldown} seconds before requesting another email.`);
            return;
        }

        setIsLoading(true);
        clearError();

        try {
            const { error: resetError } = await sendPasswordResetEmail(trimmedEmail);
            setIsLoading(false);

            if (resetError) {
                const errLower = String(resetError).toLowerCase();
                if (errLower.includes('rate limit') || errLower.includes('too many requests')) {
                    showError('Too many reset attempts. Please wait a minute before requesting another code.');
                    startCooldown(90);
                } else if (errLower.includes('network') || errLower.includes('failed to fetch')) {
                    showError('Network error. Check your internet connection and try again.');
                } else {
                    showError(resetError);
                }
                return;
            }

            setMode('verify');
            startCooldown(60);
            success('Recovery link & 6-digit code sent to your email.');
        } catch (err) {
            setIsLoading(false);
            showError(err.message || 'Unable to send reset email. Please try again.');
        }
    };

    const handleVerifyOtp = async (event) => {
        event.preventDefault();
        const trimmedEmail = email.trim();
        const cleanCode = otpCode.trim().replace(/\s+/g, '');

        if (!trimmedEmail) {
            showError('Please enter your account email address.');
            return;
        }

        if (!cleanCode || cleanCode.length < 6) {
            showError('Please enter the 6-digit verification code from your email.');
            return;
        }

        setIsVerifying(true);
        clearError();

        try {
            const { data, error: otpError } = await verifyPasswordResetOtp(trimmedEmail, cleanCode);
            setIsVerifying(false);

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
                success('Verification code accepted! You can now create your new password.');
                navigate('/reset-password?verified=1', { replace: true });
            } else {
                navigate('/reset-password', { replace: true });
            }
        } catch (err) {
            setIsVerifying(false);
            showError(err.message || 'Failed to verify recovery code.');
        }
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
                        <h1 className="auth-title">
                            {mode === 'verify' ? 'Verify Reset Code' : 'Reset Password'}
                        </h1>
                        <p className="auth-subtitle">
                            {mode === 'verify'
                                ? 'Enter the code sent to your email, or tap the email link.'
                                : 'Get a secure reset link & verification code delivered to your email.'}
                        </p>
                    </div>

                    {error && (
                        <div className="auth-error">
                            <span>!</span> {error}
                        </div>
                    )}

                    {mode === 'request' ? (
                        /* Step 1: Request Recovery Email / Code */
                        <form onSubmit={handleSendReset} className="auth-form">
                            <div className="form-group">
                                <label htmlFor="reset-email" className="form-label">Student Email</label>
                                <div className="input-wrapper">
                                    <span className="input-icon">@</span>
                                    <input
                                        id="reset-email"
                                        type="email"
                                        className="form-input"
                                        placeholder="you@university.edu"
                                        value={email}
                                        onChange={(event) => setEmail(event.target.value)}
                                        disabled={isLoading}
                                        autoComplete="email"
                                        autoCapitalize="none"
                                        spellCheck="false"
                                        required
                                    />
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                className="btn btn-primary btn-block" 
                                disabled={isLoading}
                            >
                                {isLoading ? 'Sending Recovery Code...' : 'Send Recovery Code & Link'}
                            </button>

                            <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
                                <button
                                    type="button"
                                    className="auth-toggle-link"
                                    onClick={() => setMode('verify')}
                                >
                                    Already have a 6-digit code? Enter it here
                                </button>
                            </div>
                        </form>
                    ) : (
                        /* Step 2: Enter Verification Code */
                        <form onSubmit={handleVerifyOtp} className="auth-form">
                            <div className="auth-success" style={{ marginBottom: '1.25rem' }}>
                                📬 A recovery email was dispatched to <strong>{email}</strong>. Check your inbox or spam folder for your 6-digit code or reset link.
                            </div>

                            <div className="form-group">
                                <label htmlFor="reset-email-confirm" className="form-label">Email Address</label>
                                <div className="input-wrapper">
                                    <span className="input-icon">@</span>
                                    <input
                                        id="reset-email-confirm"
                                        type="email"
                                        className="form-input"
                                        placeholder="you@university.edu"
                                        value={email}
                                        onChange={(event) => setEmail(event.target.value)}
                                        disabled={isVerifying}
                                        autoComplete="email"
                                        autoCapitalize="none"
                                        spellCheck="false"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="reset-otp-code" className="form-label">6-Digit Verification Code</label>
                                <div className="input-wrapper">
                                    <input
                                        id="reset-otp-code"
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        maxLength={10}
                                        className="form-input otp-code-input"
                                        placeholder="123456"
                                        value={otpCode}
                                        onChange={(event) => setOtpCode(event.target.value)}
                                        disabled={isVerifying}
                                        autoComplete="one-time-code"
                                        autoFocus
                                        required
                                    />
                                </div>
                                <div className="otp-hint">
                                    Enter the 6-digit code from your email, or tap the link in the message.
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                className="btn btn-primary btn-block" 
                                disabled={isVerifying || !otpCode.trim()}
                            >
                                {isVerifying ? 'Verifying Code...' : 'Verify Code & Set Password'}
                            </button>

                            <div className="auth-secondary-actions">
                                <button
                                    type="button"
                                    className="btn-ghost"
                                    onClick={handleSendReset}
                                    disabled={isLoading || cooldown > 0}
                                >
                                    {cooldown > 0 ? `Resend Code in ${cooldown}s` : 'Resend Recovery Code'}
                                </button>
                                <button
                                    type="button"
                                    className="auth-toggle-link"
                                    style={{ textAlign: 'center', marginTop: '0.25rem' }}
                                    onClick={() => setMode('request')}
                                >
                                    Use a different email address
                                </button>
                            </div>
                        </form>
                    )}

                    <p className="auth-footer" style={{ marginTop: '1.5rem' }}>
                        Remembered it? <Link to="/login" className="auth-link">Back to Sign In</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
