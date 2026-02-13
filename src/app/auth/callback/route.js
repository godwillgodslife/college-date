import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/discover';

    if (code) {
        const supabase = await createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            /*
               We cannot create a profile here because gender, age, and university are NOT NULL in the database.
               The user will be redirected to /onboarding by middleware or discover page logic,
               where they will create their profile via upsert.
            */
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Optional: Check if profile exists just for logging, but don't attempt insert
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('id', user.id)
                    .single();

                if (!profile) {
                    console.log('New OAuth user, redirecting to onboarding for profile creation.');
                }
            }

            return NextResponse.redirect(`${origin}${next}`);
        }
    }

    return NextResponse.redirect(`${origin}/auth/login?error=Could not authenticate`);
}
