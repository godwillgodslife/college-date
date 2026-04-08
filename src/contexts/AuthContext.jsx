import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { updatePresence } from '../services/profileService';

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

    const [walletBalance, setWalletBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    const [profileLoading, setProfileLoading] = useState(true);
    const [error, setError] = useState(null);
    const [onlineUserIds, setOnlineUserIds] = useState(new Set());

    // Helper to inject defaults for missing DB columns (Existing User Repair)
    const repairProfile = useCallback((profile) => {
        if (!profile) return null;
        return {
            ...profile,
            call_minutes_today: profile.call_minutes_today ?? 0,
            last_call_reset_at: profile.last_call_reset_at ?? new Date().toISOString(),
            is_premium: profile.is_premium ?? false,
            free_swipes: profile.free_swipes ?? 20,
            completion_score: profile.completion_score ?? 0
        };
    }, []);

    // Fetch user profile from Supabase
    const fetchProfile = useCallback(async (userId) => {
        setProfileLoading(true);
        try {
            const { data, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (profileError) {
                console.warn('Profile fetch warning:', profileError.message);
            }
            setUserProfile(repairProfile(data));
        } catch (err) {
            console.error('Error fetching profile:', err);
            setUserProfile(null);
        } finally {
            setProfileLoading(false);
        }
    }, []);

    // Fetch wallet balance
    const fetchWallet = useCallback(async (userId) => {
        try {
            const { data, error } = await supabase
                .from('wallets')
                .select('available_balance')
                .eq('user_id', userId)
                .maybeSingle();

            if (!error && data) {
                setWalletBalance(data.available_balance || 0);
            }
        } catch (err) {
            console.error('Error fetching wallet:', err);
        }
    }, []);

    // Initialize auth state
    useEffect(() => {
        let mounted = true;
        let lastUserId = null;

        async function syncState(user) {
            if (!mounted) return;
            
            // Deduplicate: Don't re-fetch if we already have this user's profile
            if (user && user.id === lastUserId) return;
            lastUserId = user?.id || null;

            setCurrentUser(user);

            if (user) {
                try {
                    const [{ data: profile }, { data: wallet }] = await Promise.all([
                        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
                        supabase.from('wallets').select('available_balance').eq('user_id', user.id).maybeSingle()
                    ]);

                    if (mounted) {
                        setUserProfile(repairProfile(profile));
                        setWalletBalance(wallet?.available_balance || 0);
                    }
                } catch (err) {
                    console.error("Profile fetch error in syncState:", err);
                    if (mounted) {
                        setProfileLoading(false);
                        setLoading(false);
                    }
                }
            } else {
                setUserProfile(null);
                setWalletBalance(0);
            }
            
            if (mounted) {
                setProfileLoading(false);
                setLoading(false);
            }
        }

        // 1. Initial Load
        supabase.auth.getSession().then(({ data: { session } }) => {
            syncState(session?.user || null);
        });

        // 2. Auth Listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') {
                syncState(null);
            } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
                syncState(session?.user || null);
            }
        });

        // 3. Safety Timeout (Shortened for faster failover)
        const timer = setTimeout(() => {
            if (mounted && loading) {
                console.warn('[Auth] Safety timeout triggered — proceeding to app.');
                setLoading(false);
                setProfileLoading(false);
            }
        }, 4000);

        return () => {
            mounted = false;
            subscription?.unsubscribe();
            clearTimeout(timer);
        };
    }, []);

    // Global Presence & Heartbeat
    useEffect(() => {
        if (!currentUser || !userProfile) return;

        // 1. Presence Channel
        const channel = supabase.channel('presence-global', {
            config: { presence: { key: currentUser.id } }
        });

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const ids = new Set(Object.keys(state));
                setOnlineUserIds(ids);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        id: currentUser.id,
                        full_name: userProfile.full_name,
                        online_at: new Date().toISOString()
                    });
                }
            });

        // 2. Database Heartbeat (Last Seen)
        const heartbeat = setInterval(() => {
            updatePresence(currentUser.id);
        }, 60000);
        updatePresence(currentUser.id);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(heartbeat);
        };
    }, [currentUser, userProfile]);

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

    const value = useMemo(() => ({
        currentUser,
        userProfile,
        walletBalance,
        loading,
        profileLoading,
        error,
        login,
        signup,
        loginWithGoogle,
        loginWithFacebook,
        logout,
        clearError,
        fetchProfile,
        updateProfile,
        fetchWallet,
        onlineUserIds
    }), [
        currentUser,
        userProfile,
        walletBalance,
        loading,
        profileLoading,
        error,
        login,
        signup,
        loginWithGoogle,
        loginWithFacebook,
        logout,
        clearError,
        fetchProfile,
        updateProfile,
        fetchWallet,
        onlineUserIds
    ]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
