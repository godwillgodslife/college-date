'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AdminTransactionsPage() {
    const supabase = createClient();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTransactions();
    }, []);

    const loadTransactions = async () => {
        try {
            const { data } = await supabase
                .from('transactions')
                .select('*, payer:profiles!transactions_payer_id_fkey(full_name), recipient:profiles!transactions_recipient_id_fkey(full_name)')
                .order('created_at', { ascending: false })
                .limit(50);

            setTransactions(data || []);
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) =>
        new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div>
            <h1 className="page-title" style={{ marginBottom: 24 }}>💳 Transactions</h1>

            <div className="card" style={{ overflowX: 'auto' }}>
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Payer</th>
                            <th>Recipient</th>
                            <th>Amount</th>
                            <th>Platform Fee</th>
                            <th>Recipient Earn</th>
                            <th>Status</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.map((tx) => (
                            <tr key={tx.id}>
                                <td style={{ fontWeight: 500 }}>{tx.payer?.full_name || 'N/A'}</td>
                                <td style={{ fontWeight: 500 }}>{tx.recipient?.full_name || 'N/A'}</td>
                                <td>{formatCurrency(tx.amount)}</td>
                                <td style={{ color: 'var(--accent)' }}>{formatCurrency(tx.platform_fee)}</td>
                                <td style={{ color: 'var(--success)' }}>{formatCurrency(tx.recipient_earning)}</td>
                                <td>
                                    <span className={`badge ${tx.status === 'completed' ? 'badge-success' : tx.status === 'failed' ? 'badge-danger' : 'badge-warning'}`}>
                                        {tx.status}
                                    </span>
                                </td>
                                <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                    {new Date(tx.created_at).toLocaleDateString('en-NG')}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {transactions.length === 0 && (
                    <p style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>No transactions yet</p>
                )}
            </div>
        </div>
    );
}
