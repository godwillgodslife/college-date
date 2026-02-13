'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, usePathname } from 'next/navigation';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();
    const router = useRouter();
    const pathname = usePathname();

    const fetchProfile = useCallback(async (userId) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching profile:', error);
            }

            return data;
        } catch (error) {
            console.error('Profile fetch error:', error);
            return null;
        }
    }, [supabase]);

    const refreshProfile = useCallback(async () => {
        if (!user) return;
        const data = await fetchProfile(user.id);
        setProfile(data);
        return data;
    }, [user, fetchProfile]);

    useEffect(() => {
        const initializeAuth = async () => {
            setLoading(true);
            try {
                // 1. Get Session
                const { data: { session } } = await supabase.auth.getSession();

                if (session?.user) {
                    setUser(session.user);
                    // 2. Get Profile
                    const profileData = await fetchProfile(session.user.id);
                    setProfile(profileData);
                } else {
                    setUser(null);
                    setProfile(null);
                }
            } catch (error) {
                console.error('Auth initialization error:', error);
            } finally {
                setLoading(false);
            }
        };

        initializeAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth State Change:', event);
            if (session?.user) {
                setUser(session.user);
                // Only fetch profile if we don't have it or if it's a new sign-in
                if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                    const profileData = await fetchProfile(session.user.id);
                    setProfile(profileData);
                }
            } else {
                setUser(null);
                setProfile(null);
            }
            setLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [supabase, fetchProfile]);

    // Online Status & Presence
    useEffect(() => {
        if (!user) return;

        // 1. Update DB on connect
        const setOnline = async () => {
            await supabase.from('profiles').update({
                is_online: true,
                last_seen: new Date().toISOString()
            }).eq('id', user.id);
        };
        setOnline();

        // 2. Realtime Presence
        const channel = supabase.channel('online-users');
        channel
            .on('presence', { event: 'sync' }, () => {
                // Optional: Store active user IDs if needed globally
                // const state = channel.presenceState();
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        online_at: new Date().toISOString(),
                        user_id: user.id,
                    });
                }
            });

        // 3. Cleanup: Update DB and Presence
        return () => {
            channel.unsubscribe();
            // Best effort update on unmount
            supabase.from('profiles').update({
                is_online: false,
                last_seen: new Date().toISOString()
            }).eq('id', user.id);
        };
    }, [user, supabase]);

    // Global Redirect Logic based on state
    // We execute this in a separate effect to avoid race conditions during rendering
    useEffect(() => {
        if (loading) return;

        const isAuthPage = pathname.startsWith('/auth');
        const isOnboardingParams = pathname === '/onboarding';

        if (!user && !isAuthPage) {
            // Unauthenticated users trying to access protected routes -> Login
            // Allow public landing page or public routes if any, but for now we protect everything but auth
            // console.log('Redirecting to login');
            // router.push('/auth/login');
            // Middleware handles this mostly, but client-side check is good too
        }

        if (user) {
            if (isAuthPage) {
                // Logged in users shouldn't be on auth pages
                router.push('/discover');
                return;
            }

            // Check Profile Completeness
            const isProfileComplete = profile && profile.gender && profile.age && profile.university;

            if (!isProfileComplete && !isOnboardingParams) {
                console.log('Incomplete profile, redirecting to onboarding');
                router.push('/onboarding');
            } else if (isProfileComplete && isOnboardingParams) {
                console.log('Profile complete, redirecting to discover');
                router.push('/discover');
            }
        }
    }, [user, profile, loading, pathname, router]);

    const value = {
        user,
        profile,
        loading,
        refreshProfile,
        signOut: () => supabase.auth.signOut(),
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
