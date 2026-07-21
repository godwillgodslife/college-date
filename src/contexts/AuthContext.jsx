import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { updatePresence } from '../services/profileService';
import { logoutPushNotifications } from '../services/pushNotification';
import { hasActivePremium } from '../utils/premium';
import { clearAppCache, getCachedData, setCachedData } from '../lib/persistentCache';
import { clearOfflineQueue } from '../lib/offlineQueue';
import { clearMediaCache } from '../lib/mediaCache';
import { normalizeProfile } from '../utils/profileData';

const AuthContext = createContext(null);
const NATIVE_AUTH_CALLBACK = 'com.collegedate.app://auth/callback';

function isNativePlatform() {
    return typeof window !== 'undefined' &&
        window.Capacitor !== undefined &&
        window.Capacitor.isNativePlatform?.();
}

function withTimeout(promise, timeoutMs, message) {
    return Promise.race([
        promise,
        new Promise((_, reject) => {
            setTimeout(() => reject(new Error(message)), timeoutMs);
        })
    ]);
}

function clearStoredAuthState() {
    if (typeof window === 'undefined') return;

    try {
        const localKeys = Object.keys(window.localStorage);
        localKeys.forEach((key) => {
            if (
                key.startsWith('sb-') ||
                key.includes('supabase') ||
                key.includes('auth-token') ||
                key.includes('college-date-auth')
            ) {
                window.localStorage.removeItem(key);
            }
        });

        const sessionKeys = Object.keys(window.sessionStorage);
        sessionKeys.forEach((key) => {
            if (
                key.startsWith('sb-') ||
                key.includes('supabase') ||
                key.includes('auth-token') ||
                key.includes('college-date-auth')
            ) {
                window.sessionStorage.removeItem(key);
            }
        });
    } catch (storageError) {
        console.warn('[Auth] Stored auth cleanup skipped:', storageError);
    }

    clearAppCache();
    clearOfflineQueue();
    clearMediaCache().catch(() => {});
}

function getOAuthRedirectUrl() {
    return isNativePlatform() ? NATIVE_AUTH_CALLBACK : `${window.location.origin}/auth/callback`;
}

async function openNativeOAuthBrowser(url) {
    if (!url || !isNativePlatform()) return;

    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url, presentationStyle: 'fullscreen' });
}

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
    const repairProfile = useCallback((profile, subscription = null) => {
        if (!profile) return null;
        const normalizedProfile = normalizeProfile(profile);
        const subscriptionPremium = hasActivePremium(subscription);
        return {
            ...normalizedProfile,
            call_minutes_today: normalizedProfile.call_minutes_today ?? 0,
            last_call_reset_at: normalizedProfile.last_call_reset_at ?? new Date().toISOString(),
            is_premium: subscriptionPremium || normalizedProfile.is_premium === true,
            premium_expires_at: normalizedProfile.premium_expires_at ?? subscription?.current_period_end ?? null,
            plan_type: subscriptionPremium ? 'Premium' : normalizedProfile.plan_type,
            subscription_status: subscription?.status ?? normalizedProfile.subscription_status,
            free_swipes: normalizedProfile.free_swipes ?? 20,
            completion_score: normalizedProfile.completion_score ?? 0
        };
    }, []);

    // Fetch user profile from Supabase
    const fetchProfile = useCallback(async (userId) => {
        setProfileLoading(true);
        try {
            const [{ data, error: profileError }, { data: subscription }] = await Promise.all([
                supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .maybeSingle(),
                supabase
                    .from('subscriptions')
                    .select('plan_type, status, current_period_end')
                    .eq('user_id', userId)
                    .maybeSingle()
            ]);

            if (profileError) {
                console.warn('Profile fetch warning:', profileError.message);
            }
            setUserProfile(repairProfile(data, subscription));
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
        let pendingUser = null;
        let hasPendingUser = false;
        const syncLock = { current: false };

        async function syncState(user) {
            if (!mounted) return;
            
            // Concurrency Guard: Prevent overlapping syncs from rattling the UI
            if (syncLock.current) {
                pendingUser = user || null;
                hasPendingUser = true;
                console.log('[Auth Audit] Sync Lock active - queuing latest auth event');
                return;
            }

            syncLock.current = true;
            const previousUserId = lastUserId;
            const nextUserId = user?.id || null;
            const userChanged = previousUserId !== nextUserId;
            lastUserId = user?.id || null;

            // Update user immediately so simple checks (is user logged in?) pass
            setCurrentUser(user);
            if (userChanged) {
                setUserProfile(null);
                setWalletBalance(0);
            }

            if (user) {
                console.log('[Auth Audit] Starting profile sync for:', user.id);
                const cachedProfile = getCachedData(['auth-profile', user.id], { ttlMs: 10 * 60 * 1000 });
                const cachedWallet = getCachedData(['auth-wallet', user.id], { ttlMs: 2 * 60 * 1000 });
                if (cachedProfile?.id === user.id && mounted) {
                    setUserProfile(cachedProfile);
                    setWalletBalance(cachedWallet?.available_balance || 0);
                    setProfileLoading(false);
                    setLoading(false);
                }

                try {
                    const [{ data: profile }, { data: wallet }, { data: subscription }] = await Promise.all([
                        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
                        supabase.from('wallets').select('available_balance').eq('user_id', user.id).maybeSingle(),
                        supabase.from('subscriptions').select('plan_type, status, current_period_end').eq('user_id', user.id).maybeSingle()
                    ]);

                    if (mounted) {
                        const repairedProfile = repairProfile(profile, subscription);
                        setUserProfile(repairedProfile);
                        setWalletBalance(wallet?.available_balance || 0);
                        setCachedData(['auth-profile', user.id], repairedProfile);
                        setCachedData(['auth-wallet', user.id], wallet || { available_balance: 0 });
                    }
                } catch (err) {
                    console.error("[Auth Audit] Sync error:", err);
                }
            } else {
                console.log('[Auth Audit] Clearing auth state (Logout)');
                setUserProfile(null);
                setWalletBalance(0);
            }
            
            if (mounted) {
                setProfileLoading(false);
                setLoading(false);
                syncLock.current = false;
                if (hasPendingUser && (pendingUser?.id || null) !== lastUserId) {
                    const queuedUser = pendingUser;
                    pendingUser = null;
                    hasPendingUser = false;
                    syncState(queuedUser);
                } else {
                    pendingUser = null;
                    hasPendingUser = false;
                }
                console.log('[Auth Audit] Sync Complete done');
            }
        }

        // 1. Initial Load
        supabase.auth.getSession().then(({ data: { session } }) => {
            syncState(session?.user || null);
        });

        // 2. Auth Listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            const user = event === 'SIGNED_OUT' ? null : session?.user || null;

            if (event === 'SIGNED_OUT' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
                setTimeout(() => {
                    syncState(user);
                }, 0);
            }
        });

        // 3. Safety Timeout (Shortened for faster failover)
        const timer = setTimeout(() => {
            if (mounted && loading) {
                console.warn('[Auth] Safety timeout triggered - proceeding to app.');
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
            const useNativeBrowser = isNativePlatform();
            const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: getOAuthRedirectUrl(),
                    skipBrowserRedirect: useNativeBrowser,
                },
            });
            if (oauthError) throw oauthError;
            if (useNativeBrowser) {
                await openNativeOAuthBrowser(data?.url);
            }
            return { data, error: null };
        } catch (err) {
            setError(err.message);
            return { data: null, error: err.message };
        }
    };

    const loginWithFacebook = async () => {
        try {
            setError(null);
            const useNativeBrowser = isNativePlatform();
            const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
                provider: 'facebook',
                options: {
                    redirectTo: getOAuthRedirectUrl(),
                    skipBrowserRedirect: useNativeBrowser,
                },
            });
            if (oauthError) throw oauthError;
            if (useNativeBrowser) {
                await openNativeOAuthBrowser(data?.url);
            }
            return { data, error: null };
        } catch (err) {
            setError(err.message);
            return { data: null, error: err.message };
        }
    };

    const logout = async () => {
        try {
            setError(null);
            setCurrentUser(null);
            setUserProfile(null);
            setWalletBalance(0);
            setProfileLoading(false);
            setLoading(false);

            await logoutPushNotifications();

            const { error: logoutError } = await withTimeout(
                supabase.auth.signOut({ scope: 'local' }),
                5000,
                'Logout timed out locally'
            );
            if (logoutError) throw logoutError;
            clearStoredAuthState();
            return { error: null };
        } catch (err) {
            await logoutPushNotifications();
            clearStoredAuthState();
            setError(err.message);
            console.error('Logout error:', err);
            return { error: err.message };
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
