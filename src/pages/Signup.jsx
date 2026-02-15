import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';
import './Auth.css';

export default function Signup() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState(''); // 'Male' or 'Female'
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const { signup, loginWithGoogle, loginWithFacebook, error, clearError } = useAuth();
    const { success, error: showError } = useToast();
    const navigate = useNavigate();

    // Extract referral code from URL
    const [referralCode, setReferralCode] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('ref') || '';
    });

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email || !password || !confirmPassword || !role) {
            showError('Please fill in all fields and select your role');
            return;
        }

        if (password.length < 6) {
            showError('Password must be at least 6 characters');
            return;
        }

        if (password !== confirmPassword) {
            showError('Passwords do not match');
            return;
        }

        setIsLoading(true);
        clearError();

        let referrerId = null;
        if (referralCode) {
            const { data: referrerData, error: refError } = await supabase
                .from('profiles')
                .select('id')
                .eq('referral_code', referralCode)
                .single();

            if (!refError && referrerData) {
                referrerId = referrerData.id;
            }
        }

        const { data, error: signupErr } = await signup(email, password, {
            referral_code: '', // Trigger will generate new one
            referred_by: referrerId,
            role: role
        });

        if (!signupErr && (data?.user) && referrerId) {
            // Create a record in the referrals table
            await supabase.from('referrals').insert({
                referrer_id: referrerId,
                referred_id: data.user.id,
                status: 'completed'
            });
        }

        setIsLoading(false);

        if (signupErr) {
            showError(signupErr);
        } else if (data?.session) {
            success('Account created! Welcome to College Date 💕');
            navigate('/dashboard', { replace: true });
        } else if (data?.user) {
            // User created but email not confirmed (or manual approval needed)
            success('Account created! Please check your email to confirm your account.');
            navigate('/login', { replace: true });
        } else {
            // Fallback
            success('Account created! Welcome to College Date 💕');
            navigate('/dashboard', { replace: true });
        }
    };

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        const { error: err } = await loginWithGoogle();
        if (err) {
            showError(err);
            setIsLoading(false);
        }
    };

    const handleFacebookLogin = async () => {
        setIsLoading(true);
        const { error: err } = await loginWithFacebook();
        if (err) {
            showError(err);
            setIsLoading(false);
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
                        <span className="auth-logo">💕</span>
                        <h1 className="auth-title">Join College Date</h1>
                        <p className="auth-subtitle">Create your account and start meeting people</p>
                    </div>

                    {error && (
                        <div className="auth-error">
                            <span>⚠️</span> {error}
                        </div>
                    )}

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
                            <label className="form-label">I am a...</label>
                            <div className="role-selection">
                                <button
                                    type="button"
                                    className={`role-btn ${role === 'Male' ? 'active' : ''}`}
                                    onClick={() => setRole('Male')}
                                    disabled={isLoading}
                                >
                                    🙋‍♂️ Guy
                                </button>
                                <button
                                    type="button"
                                    className={`role-btn ${role === 'Female' ? 'active' : ''}`}
                                    onClick={() => setRole('Female')}
                                    disabled={isLoading}
                                >
                                    🙋‍♀️ Lady
                                </button>
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
                                    placeholder="At least 6 characters"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={isLoading}
                                    autoComplete="new-password"
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

                        <div className="form-group">
                            <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
                            <div className="input-wrapper">
                                <span className="input-icon">🔒</span>
                                <input
                                    id="confirmPassword"
                                    type={showPassword ? 'text' : 'password'}
                                    className="form-input"
                                    placeholder="Confirm your password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    disabled={isLoading}
                                    autoComplete="new-password"
                                />
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary btn-block" disabled={isLoading}>
                            {isLoading ? (
                                <span className="btn-loading">
                                    <span className="btn-spinner"></span>
                                    Creating account...
                                </span>
                            ) : (
                                'Create Account'
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

                        <button className="btn btn-social btn-facebook" onClick={handleFacebookLogin} disabled={isLoading}>
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="#1877F2">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                            </svg>
                            Facebook
                        </button>
                    </div>

                    <p className="auth-footer">
                        Already have an account? <Link to="/login" className="auth-link">Sign In</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
