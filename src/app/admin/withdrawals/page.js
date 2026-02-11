'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AdminWithdrawalsPage() {
    const supabase = createClient();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending');

    useEffect(() => {
        loadRequests();
    }, [filter]);

    const loadRequests = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('withdrawal_requests')
                .select('*, user:profiles!withdrawal_requests_user_id_fkey(full_name, email)')
                .order('created_at', { ascending: false });

            if (filter !== 'all') {
                query = query.eq('status', filter);
            }

            const { data } = await query;
            setRequests(data || []);
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id, status) => {
        await supabase
            .from('withdrawal_requests')
            .update({
                status,
                processed_at: status === 'approved' || status === 'rejected' ? new Date().toISOString() : null,
            })
            .eq('id', id);

        if (status === 'approved') {
            const request = requests.find((r) => r.id === id);
            if (request) {
                // Deduct from wallet
                const { data: wallet } = await supabase
                    .from('wallets')
                    .select('*')
                    .eq('user_id', request.user_id)
                    .single();

                if (wallet) {
                    await supabase
                        .from('wallets')
                        .update({
                            balance: Math.max(0, wallet.balance - request.amount),
                            total_withdrawn: wallet.total_withdrawn + request.amount,
                        })
                        .eq('user_id', request.user_id);
                }
            }
        }

        loadRequests();
    };

    const formatCurrency = (amount) =>
        new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);

    return (
        <div>
            <h1 className="page-title" style={{ marginBottom: 24 }}>💸 Withdrawal Requests</h1>

            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                {['pending', 'approved', 'rejected', 'all'].map((f) => (
                    <button
                        key={f}
                        className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setFilter(f)}
                        style={{ textTransform: 'capitalize' }}
                    >
                        {f}
                    </button>
                ))}
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                    <div className="spinner" />
                </div>
            ) : (
                <div className="card" style={{ overflowX: 'auto' }}>
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Amount</th>
                                <th>Bank</th>
                                <th>Account</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.map((req) => (
                                <tr key={req.id}>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{req.user?.full_name}</div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{req.user?.email}</div>
                                    </td>
                                    <td style={{ fontWeight: 600 }}>{formatCurrency(req.amount)}</td>
                                    <td>{req.bank_name}</td>
                                    <td>
                                        <div style={{ fontSize: '0.85rem' }}>{req.account_number}</div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{req.account_name}</div>
                                    </td>
                                    <td>
                                        <span className={`badge ${req.status === 'approved' ? 'badge-success' :
                                                req.status === 'rejected' ? 'badge-danger' :
                                                    req.status === 'processed' ? 'badge-info' :
                                                        'badge-warning'
                                            }`}>
                                            {req.status}
                                        </span>
                                    </td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                        {new Date(req.created_at).toLocaleDateString('en-NG')}
                                    </td>
                                    <td>
                                        {req.status === 'pending' && (
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button
                                                    className="btn btn-sm btn-success"
                                                    onClick={() => updateStatus(req.id, 'approved')}
                                                >
                                                    ✅ Approve
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-danger"
                                                    onClick={() => updateStatus(req.id, 'rejected')}
                                                >
                                                    ✕ Reject
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {requests.length === 0 && (
                        <p style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>
                            No {filter !== 'all' ? filter : ''} withdrawal requests
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
