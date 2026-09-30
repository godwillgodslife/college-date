import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

export default function AdminActiveProgramManager({ addToast }) {
    const [config, setConfig] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [settling, setSettling] = useState(false);
    const currentMonthKey = new Date().toISOString().slice(0, 7);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch Config
            const { data: cfg } = await supabase
                .from('active_program_config')
                .select('*')
                .eq('id', 'default')
                .maybeSingle();

            setConfig(cfg);

            // Fetch Participants for current month with profile info
            const { data: partList, error: partError } = await supabase
                .from('active_program_participants')
                .select(`
                    id,
                    user_id,
                    status,
                    current_month_key,
                    qualifying_days_count,
                    accrued_earnings,
                    last_qualified_date,
                    created_at,
                    profiles:user_id (
                        full_name,
                        username,
                        gender,
                        university,
                        avatar_url
                    )
                `)
                .eq('current_month_key', currentMonthKey)
                .order('accrued_earnings', { ascending: false });

            if (partError) throw partError;
            setParticipants(partList || []);
        } catch (err) {
            console.error('[AdminActiveProgramManager] load error:', err);
            addToast?.('Failed to load active program records', 'error');
        } finally {
            setLoading(false);
        }
    }, [addToast, currentMonthKey]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleRunSettlement = async () => {
        if (!window.confirm(`Settle all qualified earnings for ${currentMonthKey}? This will credit student wallets directly.`)) {
            return;
        }

        setSettling(true);
        try {
            const { data, error } = await supabase.rpc('settle_monthly_active_earnings', {
                p_month_key: currentMonthKey
            });

            if (error) throw error;
            addToast?.(`Settlement completed! Processed: ${data?.processed_participants || 0} participants (₦${(data?.total_amount_credited_ngn || 0).toLocaleString()})`, 'success');
            loadData();
        } catch (err) {
            addToast?.(err.message || 'Settlement failed', 'error');
        } finally {
            setSettling(false);
        }
    };

    const totalLiability = participants.reduce((sum, p) => sum + Number(p.accrued_earnings || 0), 0);
    const qualifiedCount = participants.filter(p => Number(p.qualifying_days_count || 0) >= (config?.min_qualifying_days || 24)).length;

    return (
        <div className="admin-controls-grid">
            <div className="admin-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                        <h3 style={{ margin: 0 }}>⚡ College Date Active Program</h3>
                        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                            Female Campus Ambassador &amp; Liquidity Retention cycle ({currentMonthKey})
                        </p>
                    </div>
                    <button
                        className="btn-action primary"
                        onClick={handleRunSettlement}
                        disabled={settling || loading || participants.length === 0}
                    >
                        {settling ? 'Settling...' : 'Run Month-End Settlement ⚡'}
                    </button>
                </div>

                {/* Metrics Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '1.5rem' }}>
                    <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>Enrolled Users</div>
                        <strong style={{ fontSize: '1.2rem', color: '#fff' }}>{participants.length}</strong>
                    </div>
                    <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>Target Reached</div>
                        <strong style={{ fontSize: '1.2rem', color: '#10b981' }}>{qualifiedCount}</strong>
                    </div>
                    <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>Accrued Liability</div>
                        <strong style={{ fontSize: '1.2rem', color: '#ffd700' }}>₦{totalLiability.toLocaleString()}</strong>
                    </div>
                    <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>Daily / Target</div>
                        <strong style={{ fontSize: '1.1rem', color: '#38bdf8' }}>₦{config?.daily_reward || 625} / ₦{config?.monthly_target || 15000}</strong>
                    </div>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="admin-loading">Loading active participants...</div>
                ) : participants.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)' }}>
                        No enrolled participants found for {currentMonthKey}.
                    </div>
                ) : (
                    <div className="admin-table-container">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Participant</th>
                                    <th>Campus</th>
                                    <th>Gender</th>
                                    <th>Days</th>
                                    <th>Accrued Earnings</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {participants.map(p => {
                                    const profile = p.profiles || {};
                                    return (
                                        <tr key={p.id}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {profile.avatar_url && (
                                                        <img
                                                            src={profile.avatar_url}
                                                            alt=""
                                                            style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                                                        />
                                                    )}
                                                    <div>
                                                        <strong>{profile.full_name || 'Student'}</strong>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>@{profile.username || p.user_id.slice(0, 8)}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>{profile.university || 'General'}</td>
                                            <td>{profile.gender || '—'}</td>
                                            <td><strong>{p.qualifying_days_count}</strong> / {config?.min_qualifying_days || 20}</td>
                                            <td style={{ color: '#ffd700', fontWeight: '700' }}>₦{Number(p.accrued_earnings || 0).toLocaleString()}</td>
                                            <td>
                                                <span className={`status-badge ${p.status === 'active' ? 'active' : 'banned'}`}>
                                                    {p.status}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
