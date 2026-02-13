'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import SocialLogin from '@/components/SocialLogin';

const NIGERIAN_UNIVERSITIES = [
    'University of Lagos (UNILAG)',
    'University of Ibadan (UI)',
    'Obafemi Awolowo University (OAU)',
    'University of Nigeria, Nsukka (UNN)',
    'Ahmadu Bello University (ABU)',
    'University of Benin (UNIBEN)',
    'University of Ilorin (UNILORIN)',
    'Federal University of Technology, Akure (FUTA)',
    'Lagos State University (LASU)',
    'Covenant University',
    'Babcock University',
    'University of Port Harcourt (UNIPORT)',
    'Federal University of Agriculture, Abeokuta (FUNAAB)',
    'Nnamdi Azikiwe University (UNIZIK)',
    'Rivers State University',
    'Ekiti State University',
    'Osun State University',
    'Ladoke Akintola University of Technology (LAUTECH)',
    'Yaba College of Technology (YABATECH)',
    'Federal Polytechnic, Ile-Oluji',
    'Other',
];

// Google signup/login
async function signUpWithGoogle() {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: 'https://collegedate.netlify.app/auth/callback?next=/discover'
        }
    });
    if (error) console.error('Google signup error:', error);
}

// Facebook signup/login
async function signUpWithFacebook() {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
            redirectTo: 'https://collegedate.netlify.app/auth/callback?next=/discover'
        }
    });
    if (error) console.error('Facebook signup error:', error);
}

export default function SignUpPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        fullName: '',
        gender: '',
        age: '',
        university: '',
    });

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleGenderSelect = (gender) => setForm({ ...form, gender });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (form.password !== form.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (parseInt(form.age) < 18) {
            setError('You must be 18 or older to use College Date');
            return;
        }

        if (!form.gender) {
            setError('Please select your gender');
            return;
        }

        setLoading(true);

        try {
            const supabase = createClient();

            const { data, error: signUpError } = await supabase.auth.signUp({
                email: form.email,
                password: form.password,
                options: {
                    data: {
                        full_name: form.fullName,
                        gender: form.gender,
                        age: parseInt(form.age),
                        university: form.university,
                    },
                },
            });

            if (signUpError) throw signUpError;

            if (data.user) {
                // Create profile
                const { error: profileError } = await supabase.from('profiles').insert({
                    id: data.user.id,
                    email: form.email,
                    full_name: form.fullName,
                    gender: form.gender,
                    age: parseInt(form.age),
                    university: form.university,
                    free_swipes_remaining: form.gender === 'male' ? 3 : 0,
                });

                if (profileError) console.error('Profile creation error:', profileError);

                // Create wallet for female users
                if (form.gender === 'female') {
                    await supabase.from('wallets').insert({
                        user_id: data.user.id,
                    });
                }

                router.push('/onboarding');
            }
        } catch (err) {
            setError(err.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-logo">
                    <h1>College Date 💕</h1>
                    <p>Create your account and start connecting</p>
                </div>

                <div className="auth-card">
                    <form onSubmit={handleSubmit}>
                        {/* Full Name */}
                        <div className="form-group">
                            <label className="form-label">Full Name</label>
                            <input
                                type="text"
                                name="fullName"
                                className="form-input"
                                placeholder="e.g. Chioma Adeyemi"
                                value={form.fullName}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        {/* Gender */}
                        <div className="form-group">
                            <label className="form-label">I am a...</label>
                            <div className="gender-select">
                                <div
                                    className={`gender-option ${form.gender === 'male' ? 'active' : ''}`}
                                    onClick={() => handleGenderSelect('male')}
                                >
                                    <div className="gender-icon">👨</div>
                                    <div>Male</div>
                                </div>
                                <div
                                    className={`gender-option ${form.gender === 'female' ? 'active' : ''}`}
                                    onClick={() => handleGenderSelect('female')}
                                >
                                    <div className="gender-icon">👩</div>
                                    <div>Female</div>
                                </div>
                            </div>
                        </div>

                        {/* Age */}
                        <div className="form-group">
                            <label className="form-label">Age</label>
                            <input
                                type="number"
                                name="age"
                                className="form-input"
                                placeholder="Must be 18+"
                                min="18"
                                max="35"
                                value={form.age}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        {/* University */}
                        <div className="form-group">
                            <label className="form-label">University</label>
                            <select
                                name="university"
                                className="form-select"
                                value={form.university}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select your university</option>
                                {NIGERIAN_UNIVERSITIES.map((uni) => (
                                    <option key={uni} value={uni}>{uni}</option>
                                ))}
                            </select>
                        </div>

                        {/* Email */}
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input
                                type="email"
                                name="email"
                                className="form-input"
                                placeholder="your@email.com"
                                value={form.email}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        {/* Password */}
                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <input
                                type="password"
                                name="password"
                                className="form-input"
                                placeholder="Min 6 characters"
                                minLength={6}
                                value={form.password}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        {/* Confirm Password */}
                        <div className="form-group">
                            <label className="form-label">Confirm Password</label>
                            <input
                                type="password"
                                name="confirmPassword"
                                className="form-input"
                                placeholder="Re-enter password"
                                value={form.confirmPassword}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        {error && <div className="form-error" style={{ marginBottom: '16px', textAlign: 'center' }}>{error}</div>}

                        <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                            {loading ? 'Creating Account...' : '🚀 Sign Up'}
                        </button>
                    </form>

                    <SocialLogin />
                </div>

                <div className="auth-footer">
                    Already have an account? <Link href="/auth/login">Log in</Link>
                </div>
            </div >
        </div >
    );
}
