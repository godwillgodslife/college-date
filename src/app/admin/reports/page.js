'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AdminReportsPage() {
    const supabase = createClient();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadReports();
    }, []);

    const loadReports = async () => {
        try {
            const { data } = await supabase
                .from('reports')
                .select('*, reporter:profiles!reports_reporter_id_fkey(full_name, email), reported:profiles!reports_reported_id_fkey(full_name, email, is_blocked)')
                .order('created_at', { ascending: false });

            setReports(data || []);
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const updateReportStatus = async (id, status) => {
        await supabase.from('reports').update({ status }).eq('id', id);
        setReports(reports.map((r) => r.id === id ? { ...r, status } : r));
    };

    const blockUser = async (userId) => {
        await supabase.from('profiles').update({ is_blocked: true }).eq('id', userId);
        loadReports();
    };

    return (
        <div>
            <h1 className="page-title" style={{ marginBottom: 24 }}>🚨 Reports & Flagged Accounts</h1>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                    <div className="spinner" />
                </div>
            ) : reports.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">✅</div>
                    <h3 className="empty-state-title">No reports</h3>
                    <p className="empty-state-desc">All clear! No flagged accounts.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {reports.map((report) => (
                        <div key={report.id} className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                <div>
                                    <span className={`badge ${report.status === 'pending' ? 'badge-warning' : report.status === 'reviewed' ? 'badge-info' : 'badge-success'}`}>
                                        {report.status}
                                    </span>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: 8 }}>
                                        {new Date(report.created_at).toLocaleDateString('en-NG')}
                                    </span>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 12 }}>
                                <div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 4 }}>Reporter</div>
                                    <div style={{ fontWeight: 600 }}>{report.reporter?.full_name}</div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{report.reporter?.email}</div>
                                </div>
                                <div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 4 }}>Reported User</div>
                                    <div style={{ fontWeight: 600 }}>{report.reported?.full_name}</div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{report.reported?.email}</div>
                                    {report.reported?.is_blocked && <span className="badge badge-danger" style={{ marginTop: 4 }}>Blocked</span>}
                                </div>
                            </div>

                            <div style={{ marginBottom: 12 }}>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 4 }}>Reason</div>
                                <div style={{ fontWeight: 600 }}>{report.reason}</div>
                                {report.description && (
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: 4 }}>{report.description}</div>
                                )}
                            </div>

                            {report.status === 'pending' && (
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    <button className="btn btn-sm btn-primary" onClick={() => updateReportStatus(report.id, 'reviewed')}>
                                        👀 Mark Reviewed
                                    </button>
                                    <button className="btn btn-sm btn-success" onClick={() => updateReportStatus(report.id, 'resolved')}>
                                        ✅ Resolve
                                    </button>
                                    {!report.reported?.is_blocked && (
                                        <button className="btn btn-sm btn-danger" onClick={() => blockUser(report.reported_id)}>
                                            🚫 Block User
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
