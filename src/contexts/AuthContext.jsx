import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch user profile from Supabase
    const fetchProfile = useCallback(async (userId) => {
        try {
            const { data, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (profileError && profileError.code !== 'PGRST116') {
                console.warn('Profile fetch warning:', profileError.message);
            }
            setUserProfile(data || null);
        } catch (err) {
            console.error('Error fetching profile:', err);
            setUserProfile(null);
        }
    }, []);

    // Initialize auth state
    useEffect(() => {
        let mounted = true;

        async function initializeAuth() {
            try {
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                if (sessionError) {
                    console.error('Session error:', sessionError.message);
                }

                if (mounted) {
                    const user = session?.user ?? null;
                    setCurrentUser(user);
                    if (user) {
                        fetchProfile(user.id); // Don't await, let it happen in background
                    }
                    setLoading(false);
                }
            } catch (err) {
                console.error('Auth initialization error:', err);
                if (mounted) {
                    setCurrentUser(null);
                    setUserProfile(null);
                    setLoading(false);
                }
            }
        }

        initializeAuth();

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!mounted) return;

                const user = session?.user ?? null;
                setCurrentUser(user);

                if (user) {
                    fetchProfile(user.id); // Don't await
                } else {
                    setUserProfile(null);
                }
                setLoading(false);
            }
        );

        // Safety timeout to prevent infinite loading
        const timer = setTimeout(() => {
            if (mounted) {
                setLoading((prev) => {
                    if (prev) {
                        console.warn('Auth loading timeout - forcing app load');
                        return false;
                    }
                    return prev;
                });
            }
        }, 30000);

        return () => {
            mounted = false;
            subscription?.unsubscribe();
            clearTimeout(timer);
        };
    }, [fetchProfile]);

    // Auth actions
    const login = async (email, password) => {
        try {
            setError(null);
            const { data, error: loginError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (loginError) throw loginError;
            return { data, error: null };
        } catch (err) {
            setError(err.message);
            return { data: null, error: err.message };
        }
    };

    const signup = async (email, password, metadata = {}) => {
        try {
            setError(null);
            const { data, error: signupError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: metadata,
                },
            });
            if (signupError) throw signupError;
            return { data, error: null };
        } catch (err) {
            setError(err.message);
            return { data: null, error: err.message };
        }
    };

    const loginWithGoogle = async () => {
        try {
            setError(null);
            const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            });
            if (oauthError) throw oauthError;
            return { data, error: null };
        } catch (err) {
            setError(err.message);
            return { data: null, error: err.message };
        }
    };

    const loginWithFacebook = async () => {
        try {
            setError(null);
            const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
                provider: 'facebook',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            });
            if (oauthError) throw oauthError;
            return { data, error: null };
        } catch (err) {
            setError(err.message);
            return { data: null, error: err.message };
        }
    };

    const logout = async () => {
        try {
            setError(null);
            const { error: logoutError } = await supabase.auth.signOut();
            if (logoutError) throw logoutError;
            setCurrentUser(null);
            setUserProfile(null);
        } catch (err) {
            setError(err.message);
            console.error('Logout error:', err);
        }
    };

    const updateProfile = async (userId, updates) => {
        try {
            setError(null);

            // 1. Update Supabase (Upsert to handle new profiles)
            const { data, error: updateError } = await supabase
                .from('profiles')
                .upsert({ id: userId, ...updates })
                .select()
                .single();

            if (updateError) throw updateError;

            // 2. Update local state
            setUserProfile(data);

            return { data, error: null };
        } catch (err) {
            console.error('Update profile error:', err);
            setError(err.message);
            return { data: null, error: err.message };
        }
    };

    const clearError = () => setError(null);

    const value = {
        currentUser,
        userProfile,
        loading,
        error,
        login,
        signup,
        loginWithGoogle,
        loginWithFacebook,
        logout,
        clearError,
        fetchProfile,
        updateProfile,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
