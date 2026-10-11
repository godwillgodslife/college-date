import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { updatePresence } from '../services/profileService';
import { logoutPushNotifications } from '../services/pushNotification';
import { clearAppBadge } from '../services/appBadgeService';
import { hasActivePremium } from '../utils/premium';
import { clearAppCache, getCachedData, setCachedData } from '../lib/persistentCache';
import { clearOfflineQueue } from '../lib/offlineQueue';
import { clearMediaCache } from '../lib/mediaCache';
import { normalizeProfile } from '../utils/profileData';
import { clearSecureAuthStorage } from '../lib/secureAuthStorage';
import {
    clearLogoutAuthPreferences,
    getRememberMePreference,
    setPendingOAuthPreferences,
    setRememberedEmail
} from '../lib/authPreferences';
import {
    disableBiometricLogin,
    enableBiometricLoginForUser,
    getBiometricLoginState,
    promptBiometricUnlock,
    shouldRequireBiometricUnlock
} from '../services/biometricAuthService';
import { applyStoredReferralCode } from '../services/referralService';
import { recordPolicyAcceptance } from '../services/policyService';

const AuthContext = createContext(null);
const NATIVE_AUTH_CALLBACK = 'com.collegedate.app://auth/callback';
const NATIVE_PASSWORD_RESET = 'com.collegedate.app://reset-password';
const SESSION_REFRESH_SKEW_MS = 60 * 1000;

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

async function clearStoredAuthState({ preserveRememberedEmail = true } = {}) {
    try {
        await clearSecureAuthStorage();
        await clearLogoutAuthPreferences({ preserveRememberedEmail });
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

function getPasswordResetRedirectUrl() {
    return isNativePlatform() ? 'https://www.thecollegedate.com/reset-password' : `${window.location.origin}/reset-password`;
}

function isSessionExpiring(session) {
    if (!session?.expires_at) return false;
    return session.expires_at * 1000 <= Date.now() + SESSION_REFRESH_SKEW_MS;
}

function isNetworkLikeError(error) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
    const message = String(error?.message || error || '').toLowerCase();
    return message.includes('failed to fetch')
        || message.includes('network')
        || message.includes('timeout')
        || message.includes('fetch');
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
    const [biometricLocked, setBiometricLocked] = useState(false);
    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [biometricEnabled, setBiometricEnabled] = useState(false);
    const [biometricLabel, setBiometricLabel] = useState('Biometric Unlock');
    const lockedSessionRef = useRef(null);
    const syncAuthStateRef = useRef(null);
    const biometricAuthPausedRef = useRef(false);

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

    const refreshBiometricState = useCallback(async (userId = currentUser?.id) => {
        const state = await getBiometricLoginState(userId);
        setBiometricAvailable(Boolean(state.isAvailable));
        setBiometricEnabled(Boolean(state.enabled));
        setBiometricLabel(state.label || 'Biometric Unlock');
        return state;
    }, [currentUser?.id]);

    const applySuccessfulLoginPreferences = useCallback(async (session, {
        rememberMe = true,
        enableBiometrics = false,
        email = ''
    } = {}) => {
        const sessionEmail = email || session?.user?.email || '';
        await setRememberedEmail(sessionEmail, rememberMe);

        if (enableBiometrics && session?.user?.id) {
            const result = await enableBiometricLoginForUser(session.user.id);
            await refreshBiometricState(session.user.id);
            return result;
        }

        await refreshBiometricState(session?.user?.id);
        return { enabled: false, error: null };
    }, [refreshBiometricState]);

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
                const cachedProfile = getCachedData(['auth-profile', user.id], {
                    ttlMs: 10 * 60 * 1000,
                    allowStale: true
                });
                const cachedWallet = getCachedData(['auth-wallet', user.id], {
                    ttlMs: 2 * 60 * 1000,
                    allowStale: true
                });
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
                    if (mounted && cachedProfile?.id === user.id) {
                        setUserProfile(cachedProfile);
                        setWalletBalance(cachedWallet?.available_balance || 0);
                    }
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

        async function setBiometricStateForUser(userId) {
            const state = await getBiometricLoginState(userId);
            if (!mounted) return state;
            setBiometricAvailable(Boolean(state.isAvailable));
            setBiometricEnabled(Boolean(state.enabled));
            setBiometricLabel(state.label || 'Biometric Unlock');
            return state;
        }

        async function resolveInitialSession() {
            try {
                const { data: { session }, error: sessionError } = await withTimeout(
                    supabase.auth.getSession(),
                    15000,
                    'Session restore timed out'
                );

                if (sessionError) throw sessionError;
                if (!session) {
                    // Try fallback check in case getSession returned null prematurely during cold start
                    const { data: userData } = await withTimeout(supabase.auth.getUser(), 4000, 'User fetch timed out').catch(() => ({ data: {} }));
                    if (userData?.user) {
                        const { data: refreshed } = await supabase.auth.refreshSession().catch(() => ({ data: {} }));
                        if (refreshed?.session) return refreshed.session;
                    }
                    return null;
                }
                if (!isSessionExpiring(session)) return session;

                if (typeof navigator !== 'undefined' && navigator.onLine === false) {
                    console.warn('[Auth] Restored session while offline; refresh will retry when online.');
                    return session;
                }

                const { data, error: refreshError } = await withTimeout(
                    supabase.auth.refreshSession(session),
                    12000,
                    'Session refresh timed out'
                );

                if (refreshError) throw refreshError;
                return data?.session || session;
            } catch (sessionError) {
                console.warn('[Auth] Session restore failed:', sessionError?.message || sessionError);
                const msg = String(sessionError?.message || sessionError || '').toLowerCase();
                // Only clear stored auth state if the session or refresh token is explicitly revoked/invalid
                if (msg.includes('invalid_grant') || msg.includes('refresh_token_not_found') || msg.includes('token expired') || msg.includes('invalid refresh token')) {
                    await clearStoredAuthState({ preserveRememberedEmail: true });
                }
                return null;
            }
        }

        async function gateSessionWithBiometrics(session) {
            if (!session?.user) {
                lockedSessionRef.current = null;
                biometricAuthPausedRef.current = false;
                setBiometricLocked(false);
                await setBiometricStateForUser(null);
                return session;
            }

            const biometricState = await setBiometricStateForUser(session.user.id);
            if (!biometricState.isAvailable || !biometricState.enabled) {
                return session;
            }

            lockedSessionRef.current = session;
            biometricAuthPausedRef.current = true;
            setBiometricLocked(true);
            setCurrentUser(null);
            setUserProfile(null);
            setWalletBalance(0);
            setProfileLoading(false);
            setLoading(false);

            try {
                await promptBiometricUnlock();
                if (!mounted) return null;
                lockedSessionRef.current = null;
                biometricAuthPausedRef.current = false;
                setBiometricLocked(false);
                return session;
            } catch (biometricError) {
                console.warn('[Auth] Biometric unlock was not completed:', biometricError?.message || biometricError);
                return null;
            }
        }

        syncAuthStateRef.current = syncState;

        // 1. Initial Load
        resolveInitialSession().then(async (session) => {
            const unlockedSession = await gateSessionWithBiometrics(session);
            if (unlockedSession?.user) {
                syncState(unlockedSession.user);
            } else {
                syncState(null);
            }
        });

        // 2. Auth Listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            const user = event === 'SIGNED_OUT' ? null : session?.user || null;

            if (biometricAuthPausedRef.current && event !== 'SIGNED_OUT') {
                return;
            }

            if (event === 'INITIAL_SESSION' || event === 'SIGNED_OUT' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED' || event === 'PASSWORD_RECOVERY') {
                setTimeout(() => {
                    syncState(user);
                }, 0);
            }
        });

        // 3. Safety Timeout (Adjusted to allow cold start resolution)
        const timer = setTimeout(() => {
            if (mounted && loading) {
                console.warn('[Auth] Safety timeout triggered - proceeding to app.');
                setLoading(false);
                setProfileLoading(false);
            }
        }, 8000);

        return () => {
            mounted = false;
            syncAuthStateRef.current = null;
            subscription?.unsubscribe();
            clearTimeout(timer);
        };
    }, []);

    useEffect(() => {
        refreshBiometricState(currentUser?.id).catch((error) => {
            console.warn('[Auth] Biometric state refresh skipped:', error);
        });
    }, [currentUser?.id, refreshBiometricState]);

    useEffect(() => {
        if (!currentUser) return;
        let nativeAppListener = null;

        const refreshIfNeeded = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session || !isSessionExpiring(session)) return;
                if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
                const { error: refreshError } = await supabase.auth.refreshSession(session);
                if (refreshError && !isNetworkLikeError(refreshError)) {
                    console.warn('[Auth] Session refresh failed:', refreshError.message);
                    await clearStoredAuthState({ preserveRememberedEmail: true });
                    setCurrentUser(null);
                    setUserProfile(null);
                    setWalletBalance(0);
                }
            } catch (refreshError) {
                if (!isNetworkLikeError(refreshError)) {
                    console.warn('[Auth] Foreground session check failed:', refreshError);
                }
            }
        };

        window.addEventListener('focus', refreshIfNeeded);
        window.addEventListener('online', refreshIfNeeded);

        if (isNativePlatform()) {
            import('@capacitor/app')
                .then(({ App: CapApp }) => CapApp.addListener('appStateChange', ({ isActive }) => {
                    if (isActive) refreshIfNeeded();
                }))
                .then((listener) => {
                    nativeAppListener = listener;
                })
                .catch((error) => {
                    console.warn('[Auth] Native foreground listener skipped:', error);
                });
        }

        refreshIfNeeded();

        return () => {
            window.removeEventListener('focus', refreshIfNeeded);
            window.removeEventListener('online', refreshIfNeeded);
            nativeAppListener?.remove?.();
        };
    }, [currentUser]);

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
    const login = async (email, password, options = {}) => {
        try {
            setError(null);
            const normalizedEmail = String(email || '').trim().toLowerCase();
            const { data, error: loginError } = await supabase.auth.signInWithPassword({
                email: normalizedEmail,
                password,
            });
            if (loginError) throw loginError;

            biometricAuthPausedRef.current = false;
            lockedSessionRef.current = null;
            setBiometricLocked(false);

            const biometricResult = await applySuccessfulLoginPreferences(data?.session, {
                rememberMe: options.rememberMe !== false,
                enableBiometrics: options.enableBiometrics === true,
                email: normalizedEmail
            });

            if (data?.user) {
                syncAuthStateRef.current?.(data.user);
            }

            return { data, error: null, biometricError: biometricResult?.error || null };
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
            if (data?.session) {
                biometricAuthPausedRef.current = false;
                lockedSessionRef.current = null;
                setBiometricLocked(false);
                await applySuccessfulLoginPreferences(data.session, {
                    rememberMe: true,
                    email
                });
                await applyStoredReferralCode().catch(() => {});
                if (data?.user) {
                    syncAuthStateRef.current?.(data.user);
                }
            }
            if (data?.user) {
                recordPolicyAcceptance('terms', '2.0', { source: 'signup_form' }).catch(() => {});
                recordPolicyAcceptance('privacy', '2.0', { source: 'signup_form' }).catch(() => {});
            }
            return { data, error: null };
        } catch (err) {
            setError(err.message);
            return { data: null, error: err.message };
        }
    };

    const loginWithGoogle = async (options = {}) => {
        try {
            setError(null);
            await setPendingOAuthPreferences({
                rememberMe: options.rememberMe !== false,
                enableBiometrics: options.enableBiometrics === true
            });
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

    const loginWithFacebook = async (options = {}) => {
        try {
            setError(null);
            await setPendingOAuthPreferences({
                rememberMe: options.rememberMe !== false,
                enableBiometrics: options.enableBiometrics === true
            });
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
            biometricAuthPausedRef.current = false;
            lockedSessionRef.current = null;
            setBiometricLocked(false);
            setBiometricEnabled(false);

            await Promise.allSettled([
                logoutPushNotifications(),
                clearAppBadge()
            ]);

            const { error: logoutError } = await withTimeout(
                supabase.auth.signOut({ scope: 'local' }),
                5000,
                'Logout timed out locally'
            );
            if (logoutError) throw logoutError;
            await clearStoredAuthState({ preserveRememberedEmail: true });
            return { error: null };
        } catch (err) {
            await logoutPushNotifications();
            await clearStoredAuthState({ preserveRememberedEmail: true });
            biometricAuthPausedRef.current = false;
            lockedSessionRef.current = null;
            setBiometricLocked(false);
            setBiometricEnabled(false);
            setError(err.message);
            console.error('Logout error:', err);
            return { error: err.message };
        }
    };

    const unlockWithBiometrics = async () => {
        try {
            setError(null);
            let session = lockedSessionRef.current;

            if (!session?.user) {
                const { data, error: sessionError } = await supabase.auth.getSession();
                if (sessionError) throw sessionError;
                session = data?.session;
            }

            if (!session?.user) {
                throw new Error('Your saved sign-in has expired. Please sign in again.');
            }

            if (isSessionExpiring(session) && typeof navigator !== 'undefined' && navigator.onLine !== false) {
                const { data, error: refreshError } = await supabase.auth.refreshSession(session);
                if (refreshError) throw refreshError;
                session = data?.session || session;
            }

            const requiresBiometrics = await shouldRequireBiometricUnlock(session.user.id);
            if (requiresBiometrics) {
                await promptBiometricUnlock();
            }

            biometricAuthPausedRef.current = false;
            lockedSessionRef.current = null;
            setBiometricLocked(false);
            await refreshBiometricState(session.user.id);
            await syncAuthStateRef.current?.(session.user);

            return { data: { session }, error: null };
        } catch (err) {
            if (!isNetworkLikeError(err) && String(err?.message || '').toLowerCase().includes('refresh')) {
                await clearStoredAuthState({ preserveRememberedEmail: true });
            }
            setError(err.message);
            return { data: null, error: err.message };
        }
    };

    const setBiometricLoginEnabled = async (enabled) => {
        try {
            setError(null);
            if (enabled) {
                const result = await enableBiometricLoginForUser(currentUser?.id);
                await refreshBiometricState(currentUser?.id);
                if (result.error) throw new Error(result.error);
                return { enabled: true, error: null };
            }

            await disableBiometricLogin();
            await refreshBiometricState(currentUser?.id);
            return { enabled: false, error: null };
        } catch (err) {
            setError(err.message);
            return { enabled: false, error: err.message };
        }
    };

    const sendPasswordResetEmail = async (email) => {
        try {
            setError(null);
            const normalizedEmail = String(email || '').trim().toLowerCase();
            const { data, error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
                redirectTo: getPasswordResetRedirectUrl(),
            });
            if (resetError) throw resetError;
            await setRememberedEmail(normalizedEmail, await getRememberMePreference());
            try {
                sessionStorage.setItem('tcd_last_reset_email', normalizedEmail);
            } catch (_) {}
            return { data, error: null };
        } catch (err) {
            setError(err.message);
            return { data: null, error: err.message };
        }
    };

    const verifyPasswordResetOtp = async (email, token) => {
        try {
            setError(null);
            const normalizedEmail = String(email || '').trim().toLowerCase();
            const cleanToken = String(token || '').trim().replace(/\s+/g, '');
            if (!normalizedEmail || !cleanToken) {
                throw new Error('Email address and verification code are required.');
            }
            const { data, error: otpError } = await supabase.auth.verifyOtp({
                email: normalizedEmail,
                token: cleanToken,
                type: 'recovery',
            });
            if (otpError) throw otpError;
            if (data?.user) {
                syncAuthStateRef.current?.(data.user);
            }
            return { data, error: null };
        } catch (err) {
            const msg = err.message || 'Invalid or expired verification code.';
            setError(msg);
            return { data: null, error: msg };
        }
    };

    const updatePassword = async (password) => {
        try {
            setError(null);
            const { data, error: updateError } = await supabase.auth.updateUser({ password });
            if (updateError) throw updateError;
            return { data, error: null };
        } catch (err) {
            setError(err.message);
            return { data: null, error: err.message };
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
        biometricLocked,
        biometricAvailable,
        biometricEnabled,
        biometricLabel,
        login,
        signup,
        loginWithGoogle,
        loginWithFacebook,
        logout,
        unlockWithBiometrics,
        setBiometricLoginEnabled,
        sendPasswordResetEmail,
        verifyPasswordResetOtp,
        updatePassword,
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
        biometricLocked,
        biometricAvailable,
        biometricEnabled,
        biometricLabel,
        login,
        signup,
        loginWithGoogle,
        loginWithFacebook,
        logout,
        unlockWithBiometrics,
        setBiometricLoginEnabled,
        sendPasswordResetEmail,
        verifyPasswordResetOtp,
        updatePassword,
        clearError,
        fetchProfile,
        updateProfile,
        fetchWallet,
        onlineUserIds
    ]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
