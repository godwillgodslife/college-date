'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AuthListener() {
    const router = useRouter();
    const pathname = usePathname();
    const supabase = createClient();

    useEffect(() => {
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                if (session) {
                    // Check profile completeness
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('gender, age, university')
                        .eq('id', session.user.id)
                        .single();

                    const isProfileComplete = profile && profile.gender && profile.age && profile.university;

                    // Route logic
                    if (isProfileComplete) {
                        // If on auth pages or onboarding, go to discover
                        if (pathname.startsWith('/auth') || pathname === '/onboarding') {
                            router.push('/discover');
                        }
                    } else {
                        // If incomplete and NOT on onboarding, go to onboarding
                        if (pathname !== '/onboarding') {
                            router.push('/onboarding');
                        }
                    }
                }
            } else if (event === 'SIGNED_OUT') {
                router.push('/auth/login');
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [pathname, router, supabase]);

    return null;
}
