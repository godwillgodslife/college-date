'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function ReferralDashboard({ profile, onUpdate }) {
    const supabase = createClient();
    const [generating, setGenerating] = useState(false);
    const [copied, setCopied] = useState(false);

    const generateCode = async () => {
        setGenerating(true);
        try {
            const code = Math.random().toString(36).substring(2, 8).toUpperCase();
            const { error } = await supabase
                .from('profiles')
                .update({ referral_code: code })
                .eq('id', profile.id);

            if (error) throw error;
            if (onUpdate) onUpdate();
        } catch (err) {
            console.error('Error generating code:', err);
            alert('Failed to generate code. Try again.');
        } finally {
            setGenerating(false);
        }
    };

    const copyToClipboard = () => {
        const link = `${window.location.origin}/auth/signup?ref=${profile.referral_code}`;
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            marginBottom: '20px',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-md)'
        }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🚀 Invite Friends & Earn
            </h3>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                        {profile.coins || 0} 🪙
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Coins Earned</div>
                </div>
                <div style={{ textAlign: 'center', flex: 1, borderLeft: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                        {/* We would query referrals count here, assuming 0 for now or fetch it */}
                        0
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Friends Invited</div>
                </div>
            </div>

            {!profile.referral_code ? (
                <div style={{ textAlign: 'center' }}>
                    <p style={{ marginBottom: '12px', color: 'var(--text-secondary)' }}>
                        Generate your unique code to start earning rewards!
                    </p>
                    <button
                        onClick={generateCode}
                        disabled={generating}
                        className="btn btn-primary"
                    >
                        {generating ? 'Generating...' : 'Get My Referral Code'}
                    </button>
                </div>
            ) : (
                <div>
                    <div style={{
                        background: 'var(--bg-secondary)',
                        padding: '12px',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '12px'
                    }}>
                        <code style={{ fontSize: '1.2rem', fontWeight: 'bold', letterSpacing: '2px' }}>
                            {profile.referral_code}
                        </code>
                        <button
                            onClick={copyToClipboard}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--primary)',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            {copied ? 'Copied!' : 'Copy Link'}
                        </button>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                        Share this link with friends. You both get <strong>100 Coins</strong> when they sign up!
                    </p>
                </div>
            )}
        </div>
    );
}
