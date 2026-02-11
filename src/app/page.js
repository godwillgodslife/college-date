'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.push('/discover');
      } else {
        setLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p className="loading-text">Loading College Date...</p>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-container" style={{ textAlign: 'center' }}>
        <div style={{ marginBottom: '48px' }}>
          <h1 style={{
            fontSize: '3.5rem',
            fontWeight: 800,
            background: 'var(--gradient-primary)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '8px',
            lineHeight: 1.1,
          }}>
            College<br />Date 💕
          </h1>
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '1.1rem',
            marginTop: '12px',
            lineHeight: 1.5,
          }}>
            Find your campus crush.<br />
            Swipe. Match. Connect.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <button
            className="btn btn-primary btn-lg btn-full"
            onClick={() => router.push('/auth/signup')}
            style={{ fontSize: '1.05rem' }}
          >
            🚀 Get Started
          </button>
          <button
            className="btn btn-secondary btn-lg btn-full"
            onClick={() => router.push('/auth/login')}
          >
            I already have an account
          </button>
        </div>

        <div style={{
          marginTop: '48px',
          display: 'flex',
          justifyContent: 'center',
          gap: '32px',
          color: 'var(--text-muted)',
          fontSize: '0.8rem',
        }}>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-light)' }}>10K+</div>
            Students
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--secondary-light)' }}>50+</div>
            Universities
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent)' }}>5K+</div>
            Matches
          </div>
        </div>
      </div>
    </div>
  );
}
