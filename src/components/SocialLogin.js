'use client';

import { createClient } from '@/lib/supabase/client';

export default function SocialLogin() {
    const handleSocialLogin = async (provider) => {
        const supabase = createClient();
        await supabase.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo: `${location.origin}/auth/callback`,
            },
        });
    };

    return (
        <div style={{ marginTop: '24px' }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                margin: '20px 0',
                color: 'var(--text-muted)',
                fontSize: '0.9rem'
            }}>
                <div style={{ height: '1px', flex: 1, background: 'var(--border)' }}></div>
                <span>Or continue with</span>
                <div style={{ height: '1px', flex: 1, background: 'var(--border)' }}></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleSocialLogin('google')}
                >
                    Google
                </button>
                <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleSocialLogin('facebook')}
                >
                    Facebook
                </button>
            </div>
        </div>
    );
}
