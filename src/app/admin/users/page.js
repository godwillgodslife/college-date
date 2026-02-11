'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AdminUsersPage() {
    const supabase = createClient();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadUsers();
    }, [filter]);

    const loadUsers = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (filter === 'male') query = query.eq('gender', 'male');
            if (filter === 'female') query = query.eq('gender', 'female');
            if (filter === 'blocked') query = query.eq('is_blocked', true);

            const { data } = await query;
            setUsers(data || []);
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleBlock = async (userId, isBlocked) => {
        await supabase
            .from('profiles')
            .update({ is_blocked: !isBlocked })
            .eq('id', userId);

        setUsers(users.map((u) =>
            u.id === userId ? { ...u, is_blocked: !isBlocked } : u
        ));
    };

    const toggleVerify = async (userId, isVerified) => {
        await supabase
            .from('profiles')
            .update({ is_verified: !isVerified })
            .eq('id', userId);

        setUsers(users.map((u) =>
            u.id === userId ? { ...u, is_verified: !isVerified } : u
        ));
    };

    const filteredUsers = users.filter((u) =>
        u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.university?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div>
            <h1 className="page-title" style={{ marginBottom: 24 }}>👥 User Management</h1>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                {['all', 'male', 'female', 'blocked'].map((f) => (
                    <button
                        key={f}
                        className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setFilter(f)}
                    >
                        {f === 'all' ? '👥 All' : f === 'male' ? '👨 Male' : f === 'female' ? '👩 Female' : '🚫 Blocked'}
                    </button>
                ))}
            </div>

            {/* Search */}
            <input
                type="text"
                className="form-input"
                style={{ marginBottom: 20, maxWidth: 400 }}
                placeholder="Search by name, email, or university..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />

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
                                <th>Gender</th>
                                <th>University</th>
                                <th>Status</th>
                                <th>Joined</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map((user) => (
                                <tr key={user.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <img
                                                src={user.avatar_url || '/placeholder-avatar.png'}
                                                alt=""
                                                style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }}
                                            />
                                            <div>
                                                <div style={{ fontWeight: 600 }}>{user.full_name}</div>
                                                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ textTransform: 'capitalize' }}>{user.gender}</td>
                                    <td style={{ fontSize: '0.85rem' }}>{user.university}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                            {user.is_verified && <span className="badge badge-success">Verified</span>}
                                            {user.is_blocked && <span className="badge badge-danger">Blocked</span>}
                                            {!user.is_verified && !user.is_blocked && <span className="badge badge-warning">Unverified</span>}
                                        </div>
                                    </td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                        {new Date(user.created_at).toLocaleDateString('en-NG')}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button
                                                className={`btn btn-sm ${user.is_verified ? 'btn-secondary' : 'btn-success'}`}
                                                onClick={() => toggleVerify(user.id, user.is_verified)}
                                            >
                                                {user.is_verified ? 'Unverify' : '✅ Verify'}
                                            </button>
                                            <button
                                                className={`btn btn-sm ${user.is_blocked ? 'btn-secondary' : 'btn-danger'}`}
                                                onClick={() => toggleBlock(user.id, user.is_blocked)}
                                            >
                                                {user.is_blocked ? 'Unblock' : '🚫 Block'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredUsers.length === 0 && (
                        <p style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>No users found</p>
                    )}
                </div>
            )}
        </div>
    );
}
