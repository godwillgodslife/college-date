import { Fragment, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import './AdminDashboard.css';

// Helpers
const fmt = (n) => Number(n || 0).toLocaleString();
const fmtCurrency = (n) => `NGN ${fmt(n)}`;
const fmtK = (n) => n >= 1000 ? `NGN ${(n / 1000).toFixed(1)}k` : fmtCurrency(n);
const statusClass = (status) => ['completed', 'success', 'active', 'sent'].includes(String(status).toLowerCase())
    ? 'active'
    : ['pending', 'sending', 'queued', 'skipped'].includes(String(status).toLowerCase())
        ? 'shadow'
        : 'banned';
const pushSegmentLabels = {
    all: 'All opted-in',
    active_7d: 'Active 7 days',
    inactive_7d: 'Inactive 7+ days',
};
const adminPermissionOptions = [
    ['users:read', 'Read users'],
    ['users:moderate', 'Moderate users'],
    ['content:moderate', 'Moderate content'],
    ['finance:read', 'Read finance'],
    ['finance:payouts', 'Review payouts'],
    ['config:write', 'App config'],
    ['promo:write', 'Promo codes'],
    ['push:broadcast', 'Push broadcast'],
    ['audit:read', 'Audit logs'],
];
const userStatusField = { ban: 'is_banned', shadow: 'is_shadow_banned', verify: 'is_verified' };
const userStatusLabels = {
    ban: { on: 'Ban user', off: 'Unban user' },
    shadow: { on: 'Shadow-ban user', off: 'Remove shadow-ban' },
    verify: { on: 'Verify user', off: 'Remove verification' },
};
const AUDIT_PAGE_SIZE = 50;
const USER_PAGE_SIZE = 50;
const CONTENT_PAGE_SIZE = 50;
const TRANSACTION_PAGE_SIZE = 100;
const ADMIN_PREFS_KEY = 'college-date-admin-dashboard-prefs-v1';
const readAdminPrefs = () => {
    if (typeof window === 'undefined') return {};
    try {
        const raw = window.localStorage.getItem(ADMIN_PREFS_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
};
const writeAdminPrefs = (prefs) => {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(ADMIN_PREFS_KEY, JSON.stringify(prefs));
    } catch {
        // Local storage can be unavailable in private browsing or hardened webviews.
    }
};
const clearAdminPrefs = () => {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.removeItem(ADMIN_PREFS_KEY);
    } catch {
        // Ignore storage cleanup failures; in-memory state can still be reset.
    }
};
const auditMetadataSummary = (metadata = {}) => {
    if (!metadata || typeof metadata !== 'object') return '';
    return metadata.reason || metadata.note || metadata.key || metadata.code || JSON.stringify(metadata).slice(0, 180);
};
const auditMetadataJson = (metadata = {}) => {
    if (!metadata || typeof metadata !== 'object') return '{}';
    try {
        return JSON.stringify(metadata, null, 2);
    } catch {
        return String(metadata);
    }
};
const fmtTime = (value) => value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Not loaded';
const bankDetailsSummary = (details = {}) => {
    if (!details || typeof details !== 'object') return 'No bank details';
    const bank = details.bank || details.bank_name || details.bankName || 'Bank';
    const account = details.account || details.account_number || details.accountNumber || '';
    const name = details.account_name || details.accountName || details.name || '';
    return [bank, account, name].filter(Boolean).join(' / ') || 'Bank details saved';
};
const userAttentionProfile = (user = {}) => {
    const reasons = [];
    let score = 0;
    if (user.is_banned) {
        score += 5;
        reasons.push('Banned');
    }
    if (user.is_shadow_banned) {
        score += 4;
        reasons.push('Shadow limited');
    }
    if (!user.is_verified) {
        score += 1;
        reasons.push('Unverified');
    }
    if (Number(user.report_count || user.reports_count || user.pending_reports || 0) > 0) {
        score += 3;
        reasons.push('Reported');
    }
    if (Number(user.pending_balance || user.wallet_pending_balance || 0) > 0) {
        score += 2;
        reasons.push('Pending wallet');
    }
    if (user.ai_verification_status && !['approved', 'verified', 'pass'].includes(String(user.ai_verification_status).toLowerCase())) {
        score += 2;
        reasons.push(`AI ${String(user.ai_verification_status).replace(/_/g, ' ')}`);
    }
    if (user.is_premium && !user.is_banned && !user.is_shadow_banned) {
        reasons.push('Premium');
    }
    const tone = score >= 5 ? 'danger' : score >= 3 ? 'warning' : score >= 1 ? 'neutral' : 'ok';
    const label = score >= 5 ? 'High attention' : score >= 3 ? 'Review' : score >= 1 ? 'Watch' : 'Clear';
    return { score, tone, label, reasons: reasons.slice(0, 3) };
};

// Mini Bar Chart
function BarChart({ data = [], labelKey = 'date', valueKey = 'count', color = '#38bdf8', prefix = '' }) {
    const max = Math.max(...data.map(d => d[valueKey] || 0), 1);
    return (
        <div className="bar-chart">
            {data.map((d, i) => (
                <div key={i} className="bar-item">
                    <div className="bar-track">
                        <div
                            className="bar-fill"
                            style={{ height: `${Math.max(4, (d[valueKey] / max) * 100)}%`, background: color }}
                            title={`${prefix}${fmt(d[valueKey])}`}
                        />
                    </div>
                    <span className="bar-label">{String(d[labelKey] || '').slice(5)}</span>
                </div>
            ))}
        </div>
    );
}

// User Profile Drawer
function UserDrawer({ user, onClose, onCopy, onAudit, onStatusAction, canModerate = false }) {
    const [profile, setProfile] = useState(user);
    const [wallet, setWallet] = useState(null);
    const [txns, setTxns] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setProfile(user);
    }, [user]);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            const { data, error } = await supabase.rpc('admin_get_user_detail', { p_user_id: user.id });
            if (cancelled) return;
            if (error) {
                console.error('Failed to load admin user detail:', error);
                setWallet(null);
                setTxns([]);
                setLoading(false);
                return;
            }
            setProfile(prev => data?.profile && Object.keys(data.profile).length > 0 ? { ...prev, ...data.profile } : prev);
            setWallet(data?.wallet || null);
            setTxns(data?.transactions || []);
            setLoading(false);
        }
        load();

        return () => {
            cancelled = true;
        };
    }, [user.id]);

    const displayUser = profile || user;
    const attention = userAttentionProfile({
        ...displayUser,
        pending_balance: wallet?.pending_balance,
    });
    const recentTxnSummary = txns.reduce((acc, txn) => {
        const amount = Number(txn.amount || 0);
        if (txn.type === 'credit') acc.credit += amount;
        if (txn.type === 'debit') acc.debit += amount;
        if (String(txn.status || '').toLowerCase() === 'pending') acc.pending += 1;
        return acc;
    }, { credit: 0, debit: 0, pending: 0 });
    const premiumExpiry = displayUser.premium_expires_at ? new Date(displayUser.premium_expires_at) : null;
    const accountFlags = [
        displayUser.is_banned && { tone: 'danger', label: 'Banned account', detail: 'User is blocked from normal app access.' },
        displayUser.is_shadow_banned && { tone: 'warning', label: 'Shadow banned', detail: 'User is limited without obvious feedback.' },
        displayUser.is_premium && { tone: 'info', label: 'Premium user', detail: premiumExpiry ? `Expires ${premiumExpiry.toLocaleDateString()}` : 'Premium entitlement is active.' },
        wallet && Number(wallet.pending_balance || 0) > 0 && { tone: 'warning', label: 'Pending wallet balance', detail: `${fmtCurrency(wallet.pending_balance)} is not yet available.` },
        txns.some(txn => String(txn.status || '').toLowerCase() === 'pending') && { tone: 'warning', label: 'Pending transactions', detail: `${recentTxnSummary.pending} recent pending row${recentTxnSummary.pending === 1 ? '' : 's'}.` },
        !displayUser.is_verified && { tone: 'neutral', label: 'Unverified profile', detail: 'Profile has no verification badge.' },
    ].filter(Boolean);

    return (
        <div className="user-drawer-overlay" onClick={onClose}>
            <div className="user-drawer" onClick={e => e.stopPropagation()}>
                <button className="drawer-close" onClick={onClose}>x</button>
                <div className="drawer-avatar-row">
                    <img src={displayUser.avatar_url || '/default-avatar.png'} alt="" className="drawer-avatar" />
                    <div>
                        <h2>{displayUser.full_name} {displayUser.is_verified && <span className="verified-mark">Verified</span>}</h2>
                        <p>{displayUser.university}</p>
                        <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{displayUser.email}</p>
                        <div className="entity-meta-row">
                            <code>{displayUser.id}</code>
                            <button type="button" className="copy-chip" onClick={() => onCopy?.(displayUser.id, 'User ID')}>Copy ID</button>
                            {displayUser.email && <button type="button" className="copy-chip" onClick={() => onCopy?.(displayUser.email, 'Email')}>Copy email</button>}
                            {onAudit && <button type="button" className="copy-chip accent" onClick={() => onAudit(displayUser.id, 'profile')}>Audit trail</button>}
                        </div>
                    </div>
                </div>
                <div className="drawer-status-row">
                    {displayUser.is_banned && <span className="status-badge banned">Banned</span>}
                    {displayUser.is_shadow_banned && <span className="status-badge shadow">Shadow banned</span>}
                    {displayUser.is_verified && <span className="status-badge active">Verified</span>}
                    {displayUser.is_premium && <span className="status-badge premium">Premium</span>}
                    {!displayUser.is_banned && !displayUser.is_shadow_banned && <span className="status-badge active">Active</span>}
                </div>
                <div className={`user-attention-card ${attention.tone}`}>
                    <span>Operator attention</span>
                    <strong>{attention.label}</strong>
                    <small>{attention.reasons.length > 0 ? attention.reasons.join(' / ') : 'No obvious account risk flags in the loaded dossier.'}</small>
                </div>
                <div className="drawer-action-strip">
                    <button
                        type="button"
                        className={`btn-action ${displayUser.is_verified ? 'btn-unverify' : 'btn-verify'}`}
                        disabled={!canModerate}
                        onClick={() => onStatusAction?.(displayUser.id, 'verify', !displayUser.is_verified)}
                    >
                        {displayUser.is_verified ? 'Remove verification' : 'Verify profile'}
                    </button>
                    <button
                        type="button"
                        className={`btn-action ${displayUser.is_shadow_banned ? 'btn-unshadow' : 'btn-shadow'}`}
                        disabled={!canModerate}
                        onClick={() => onStatusAction?.(displayUser.id, 'shadow', !displayUser.is_shadow_banned)}
                    >
                        {displayUser.is_shadow_banned ? 'Remove shadow' : 'Shadow-ban'}
                    </button>
                    <button
                        type="button"
                        className={`btn-action ${displayUser.is_banned ? 'btn-unban' : 'btn-ban'}`}
                        disabled={!canModerate}
                        onClick={() => onStatusAction?.(displayUser.id, 'ban', !displayUser.is_banned)}
                    >
                        {displayUser.is_banned ? 'Unban' : 'Ban'}
                    </button>
                </div>
                {!canModerate && (
                    <div className="drawer-permission-note">
                        Your admin role can inspect this dossier but cannot change account status.
                    </div>
                )}
                <div className="drawer-dossier-grid">
                    <div className="drawer-dossier-card">
                        <span>Wallet available</span>
                        <strong>{fmtCurrency(wallet?.available_balance ?? wallet?.balance)}</strong>
                    </div>
                    <div className="drawer-dossier-card">
                        <span>Recent credits</span>
                        <strong className="credit">{fmtCurrency(recentTxnSummary.credit)}</strong>
                    </div>
                    <div className="drawer-dossier-card">
                        <span>Recent debits</span>
                        <strong className="debit">{fmtCurrency(recentTxnSummary.debit)}</strong>
                    </div>
                </div>
                <div className="drawer-flag-list">
                    {accountFlags.length === 0 ? (
                        <div className="drawer-flag neutral">
                            <strong>No immediate account flags</strong>
                            <span>Profile, wallet, and recent transactions have no obvious warning markers.</span>
                        </div>
                    ) : accountFlags.map(flag => (
                        <div className={`drawer-flag ${flag.tone}`} key={flag.label}>
                            <strong>{flag.label}</strong>
                            <span>{flag.detail}</span>
                        </div>
                    ))}
                </div>
                <div className="drawer-stats">
                    <div className="drawer-stat">
                        <span className="dstat-label">Earned</span>
                        <span className="dstat-value" style={{ color: '#4ade80' }}>{fmtCurrency(wallet?.total_earned)}</span>
                    </div>
                    <div className="drawer-stat">
                        <span className="dstat-label">Spent</span>
                        <span className="dstat-value" style={{ color: '#f87171' }}>{fmtCurrency(wallet?.total_spent)}</span>
                    </div>
                    <div className="drawer-stat">
                        <span className="dstat-label">Gender</span>
                        <span className="dstat-value" style={{ textTransform: 'capitalize' }}>{displayUser.gender || '-'}</span>
                    </div>
                    <div className="drawer-stat">
                        <span className="dstat-label">University</span>
                        <span className="dstat-value" style={{ fontSize: '0.85rem' }}>{displayUser.university || '-'}</span>
                    </div>
                    <div className="drawer-stat">
                        <span className="dstat-label">Joined</span>
                        <span className="dstat-value" style={{ fontSize: '0.85rem' }}>{displayUser.created_at ? new Date(displayUser.created_at).toLocaleDateString() : '-'}</span>
                    </div>
                    <div className="drawer-stat">
                        <span className="dstat-label">Last seen</span>
                        <span className="dstat-value" style={{ fontSize: '0.85rem' }}>{displayUser.last_seen_at || displayUser.last_active ? new Date(displayUser.last_seen_at || displayUser.last_active).toLocaleString() : '-'}</span>
                    </div>
                </div>
                <h4 style={{ margin: '16px 0 8px', color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase' }}>Recent Transactions</h4>
                {loading ? <div className="admin-loading" style={{ height: '80px' }}>Loading...</div> : (
                    <div className="drawer-txn-list">
                        {txns.length === 0 ? <p style={{ color: '#475569', textAlign: 'center' }}>No transactions</p> : txns.map(t => (
                            <div key={t.id} className="drawer-txn">
                                <span className="txn-desc">
                                    {t.description || t.type}
                                    {(t.reference_id || t.id) && (
                                        <button type="button" className="copy-chip" onClick={() => onCopy?.(t.reference_id || t.id, t.reference_id ? 'Reference' : 'Transaction ID')}>
                                            Copy ref
                                        </button>
                                    )}
                                </span>
                                <span className={`txn-amount ${t.type === 'credit' ? 'credit' : 'debit'}`}>
                                    {t.type === 'credit' ? '+' : '-'}{fmtCurrency(t.amount)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function ModerationCaseDrawer({ item, type, onClose, onCopy, onAudit, onDeleteConfession, onDismissReport, onDeleteReported, canModerate = false }) {
    if (!item) return null;

    const isReport = type === 'report';
    const confession = isReport ? item.confessions || {} : item;
    const confessionId = item.confession_id || item.id;
    const content = confession.content || item.content || 'Content unavailable';
    const createdAt = confession.created_at || item.created_at;
    const reportCreatedAt = isReport ? item.created_at : null;
    const status = item.status || 'pending';

    return (
        <div className="moderation-drawer-overlay" onClick={onClose}>
            <div className="moderation-drawer" onClick={event => event.stopPropagation()}>
                <button className="drawer-close" onClick={onClose}>x</button>
                <div className="moderation-case-header">
                    <span className={`status-badge ${isReport ? statusClass(status) : 'shadow'}`}>
                        {isReport ? status : 'Confession'}
                    </span>
                    <h2>{isReport ? 'Report case file' : 'Confession case file'}</h2>
                    <p>{isReport ? 'Review the report context before dismissing or deleting.' : 'Inspect confession details before taking moderation action.'}</p>
                </div>

                <div className="moderation-case-body">
                    <span>Content under review</span>
                    <p>{content}</p>
                </div>

                <div className="moderation-case-grid">
                    <div>
                        <span>University</span>
                        <strong>{confession.university || item.university || '-'}</strong>
                    </div>
                    <div>
                        <span>Posted</span>
                        <strong>{createdAt ? new Date(createdAt).toLocaleString() : '-'}</strong>
                    </div>
                    {isReport && (
                        <>
                            <div>
                                <span>Report reason</span>
                                <strong>{item.reason || '-'}</strong>
                            </div>
                            <div>
                                <span>Reported</span>
                                <strong>{reportCreatedAt ? new Date(reportCreatedAt).toLocaleString() : '-'}</strong>
                            </div>
                        </>
                    )}
                </div>

                <div className="moderation-id-stack">
                    <div className="entity-meta-row">
                        <code>{confessionId}</code>
                        <button type="button" className="copy-chip" onClick={() => onCopy?.(confessionId, 'Confession ID')}>Copy confession ID</button>
                        {onAudit && <button type="button" className="copy-chip accent" onClick={() => onAudit(confessionId, 'confession')}>Confession audit</button>}
                    </div>
                    {isReport && item.id && (
                        <div className="entity-meta-row">
                            <code>{item.id}</code>
                            <button type="button" className="copy-chip" onClick={() => onCopy?.(item.id, 'Report ID')}>Copy report ID</button>
                            {onAudit && <button type="button" className="copy-chip accent" onClick={() => onAudit(item.id, 'confession_report')}>Report audit</button>}
                        </div>
                    )}
                </div>

                <div className="moderation-risk-note">
                    <strong>Decision guardrail</strong>
                    <span>{isReport ? 'Dismiss only when the report is clearly not actionable. Delete only when the content itself violates policy.' : 'Deletion removes this content from the live app and records the audit reason.'}</span>
                </div>

                <div className="moderation-drawer-actions">
                    {isReport ? (
                        status === 'pending' ? (
                            <>
                                <button className="btn-action btn-verify" disabled={!canModerate} onClick={() => onDismissReport?.(item)}>Dismiss report</button>
                                <button className="btn-action btn-ban" disabled={!canModerate} onClick={() => onDeleteReported?.(item)}>Delete post</button>
                            </>
                        ) : (
                            <span className={`status-badge ${statusClass(status)}`}>Already {status}</span>
                        )
                    ) : (
                        <button className="btn-action btn-ban" disabled={!canModerate} onClick={() => onDeleteConfession?.(item)}>Delete confession</button>
                    )}
                </div>
            </div>
        </div>
    );
}

function PayoutCaseDrawer({ withdrawal, onClose, onCopy, onAudit, onReview, canReview = false }) {
    if (!withdrawal) return null;

    const bankDetails = withdrawal.bank_details || {};
    const bankRows = [
        ['Bank', bankDetails.bank || bankDetails.bank_name || bankDetails.bankName],
        ['Account number', bankDetails.account || bankDetails.account_number || bankDetails.accountNumber],
        ['Account name', bankDetails.account_name || bankDetails.accountName || bankDetails.name],
    ].filter(([, value]) => value);
    const isPending = withdrawal.status === 'pending';

    return (
        <div className="payout-drawer-overlay" onClick={onClose}>
            <div className="payout-drawer" onClick={event => event.stopPropagation()}>
                <button className="drawer-close" onClick={onClose}>x</button>
                <div className="payout-case-header">
                    <span className={`status-badge ${statusClass(withdrawal.status)}`}>{withdrawal.status}</span>
                    <h2>Payout review file</h2>
                    <p>Confirm requester identity, bank details, and pending liability before making a money movement decision.</p>
                </div>

                <div className="payout-amount-card">
                    <span>Requested amount</span>
                    <strong>{fmtCurrency(withdrawal.amount)}</strong>
                    <small>Requested {withdrawal.created_at ? new Date(withdrawal.created_at).toLocaleString() : '-'}</small>
                </div>

                <div className="payout-case-grid">
                    <div>
                        <span>Requester</span>
                        <strong>{withdrawal.full_name || 'Unknown user'}</strong>
                        <small>{withdrawal.email || withdrawal.user_id || '-'}</small>
                    </div>
                    <div>
                        <span>University</span>
                        <strong>{withdrawal.university || '-'}</strong>
                        <small>{withdrawal.gender || '-'}</small>
                    </div>
                    <div>
                        <span>Bank summary</span>
                        <strong>{bankDetailsSummary(bankDetails)}</strong>
                    </div>
                    <div>
                        <span>Reviewed</span>
                        <strong>{withdrawal.processed_at ? new Date(withdrawal.processed_at).toLocaleString() : 'Not reviewed'}</strong>
                    </div>
                </div>

                <div className="payout-bank-list">
                    {bankRows.length === 0 ? (
                        <div>
                            <span>Bank details</span>
                            <strong>No bank details saved</strong>
                        </div>
                    ) : bankRows.map(([label, value]) => (
                        <div key={label}>
                            <span>{label}</span>
                            <strong>{value}</strong>
                        </div>
                    ))}
                </div>

                <div className="moderation-id-stack">
                    <div className="entity-meta-row">
                        <code>{withdrawal.id}</code>
                        <button type="button" className="copy-chip" onClick={() => onCopy?.(withdrawal.id, 'Withdrawal ID')}>Copy payout ID</button>
                        {onAudit && <button type="button" className="copy-chip accent" onClick={() => onAudit(withdrawal.id, 'withdrawal')}>Payout audit</button>}
                    </div>
                    {withdrawal.user_id && (
                        <div className="entity-meta-row">
                            <code>{withdrawal.user_id}</code>
                            <button type="button" className="copy-chip" onClick={() => onCopy?.(withdrawal.user_id, 'User ID')}>Copy user ID</button>
                            {onAudit && <button type="button" className="copy-chip accent" onClick={() => onAudit(withdrawal.user_id, 'profile')}>User audit</button>}
                        </div>
                    )}
                </div>

                <div className="payout-risk-note">
                    <strong>Money movement guardrail</strong>
                    <span>Approve only after bank details and payout batch handling are verified. Rejecting refunds the amount back to the user available balance.</span>
                </div>

                <div className="payout-drawer-actions">
                    {isPending ? (
                        <>
                            <button className="btn-action btn-verify" disabled={!canReview} onClick={() => onReview?.(withdrawal, 'approve')}>Approve payout</button>
                            <button className="btn-action btn-ban" disabled={!canReview} onClick={() => onReview?.(withdrawal, 'reject')}>Reject payout</button>
                        </>
                    ) : (
                        <span className={`status-badge ${statusClass(withdrawal.status)}`}>Already {withdrawal.status}</span>
                    )}
                </div>
            </div>
        </div>
    );
}

function TransactionDetailDrawer({ transaction, onClose, onCopy, onAudit, onOpenUser }) {
    if (!transaction) return null;

    const reference = transaction.reference_id || transaction.reference || transaction.id;
    const source = transaction.payment_method || transaction.source || 'wallet';
    const description = transaction.description || transaction.note || transaction.type || 'Transaction';

    return (
        <div className="transaction-drawer-overlay" onClick={onClose}>
            <div className="transaction-drawer" onClick={event => event.stopPropagation()}>
                <button className="drawer-close" onClick={onClose}>x</button>
                <div className="transaction-case-header">
                    <span className={`status-badge ${statusClass(transaction.status)}`}>{transaction.status || 'unknown'}</span>
                    <h2>Transaction detail</h2>
                    <p>Inspect ledger context, copy references, and pivot to the user or audit trail.</p>
                </div>

                <div className={`transaction-amount-card ${transaction.type === 'debit' ? 'debit' : 'credit'}`}>
                    <span>{transaction.type || 'Transaction'} amount</span>
                    <strong>{fmtCurrency(transaction.amount)}</strong>
                    <small>{transaction.created_at ? new Date(transaction.created_at).toLocaleString() : '-'}</small>
                </div>

                <div className="transaction-case-grid">
                    <div>
                        <span>User</span>
                        <strong>{transaction.full_name || 'Unknown user'}</strong>
                        <small>{transaction.email || transaction.user_id || '-'}</small>
                    </div>
                    <div>
                        <span>University</span>
                        <strong>{transaction.university || '-'}</strong>
                        <small>{transaction.gender || '-'}</small>
                    </div>
                    <div>
                        <span>Source</span>
                        <strong>{String(source).replace(/_/g, ' ')}</strong>
                    </div>
                    <div>
                        <span>Description</span>
                        <strong>{description}</strong>
                    </div>
                </div>

                <div className="moderation-id-stack">
                    <div className="entity-meta-row">
                        <code>{transaction.id}</code>
                        <button type="button" className="copy-chip" onClick={() => onCopy?.(transaction.id, 'Transaction ID')}>Copy transaction ID</button>
                        {onAudit && <button type="button" className="copy-chip accent" onClick={() => onAudit(transaction.id)}>Search audit</button>}
                    </div>
                    {reference && (
                        <div className="entity-meta-row">
                            <code>{reference}</code>
                            <button type="button" className="copy-chip" onClick={() => onCopy?.(reference, 'Transaction reference')}>Copy reference</button>
                        </div>
                    )}
                    {transaction.user_id && (
                        <div className="entity-meta-row">
                            <code>{transaction.user_id}</code>
                            <button type="button" className="copy-chip" onClick={() => onCopy?.(transaction.user_id, 'User ID')}>Copy user ID</button>
                            {onAudit && <button type="button" className="copy-chip accent" onClick={() => onAudit(transaction.user_id, 'profile')}>User audit</button>}
                        </div>
                    )}
                </div>

                <div className="transaction-risk-note">
                    <strong>Ledger guardrail</strong>
                    <span>Use the reference and source fields to reconcile with Paystack, RevenueCat, Google Play, or wallet records before making manual finance decisions.</span>
                </div>

                <div className="transaction-drawer-actions">
                    {transaction.user_id && (
                        <button
                            className="btn-action"
                            onClick={() => onOpenUser?.({
                                id: transaction.user_id,
                                full_name: transaction.full_name,
                                email: transaction.email,
                                university: transaction.university,
                                gender: transaction.gender,
                            })}
                        >
                            Open user dossier
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function PromoDetailDrawer({ promo, onClose, onCopy, onAudit, onDeactivate, canWrite = false }) {
    if (!promo) return null;

    const uses = Number(promo.uses_count || 0);
    const maxUses = Number(promo.max_uses || 0);
    const usagePct = maxUses > 0 ? Math.min(100, Math.round((uses / maxUses) * 100)) : 0;

    return (
        <div className="promo-drawer-overlay" onClick={onClose}>
            <div className="promo-drawer" onClick={event => event.stopPropagation()}>
                <button className="drawer-close" onClick={onClose}>x</button>
                <div className="promo-case-header">
                    <span className={`status-badge ${promo.is_active ? 'active' : 'banned'}`}>{promo.is_active ? 'Active' : 'Inactive'}</span>
                    <h2>Promo campaign file</h2>
                    <p>Review campaign limits, usage, and audit context before sharing or deactivating a code.</p>
                </div>

                <div className="promo-code-card">
                    <span>Promo code</span>
                    <strong>{promo.code}</strong>
                    <button type="button" className="copy-chip" onClick={() => onCopy?.(promo.code, 'Promo code')}>Copy code</button>
                </div>

                <div className="promo-case-grid">
                    <div>
                        <span>Discount</span>
                        <strong>{promo.discount_percent}%</strong>
                    </div>
                    <div>
                        <span>Usage</span>
                        <strong>{uses}/{maxUses || 'unlimited'}</strong>
                    </div>
                    <div>
                        <span>Created</span>
                        <strong>{promo.created_at ? new Date(promo.created_at).toLocaleString() : '-'}</strong>
                    </div>
                    <div>
                        <span>Expires</span>
                        <strong>{promo.expires_at ? new Date(promo.expires_at).toLocaleString() : 'No expiry'}</strong>
                    </div>
                </div>

                <div className="promo-usage-meter" aria-label={`Promo usage ${usagePct}%`}>
                    <div style={{ width: `${usagePct}%` }} />
                </div>

                <div className="moderation-id-stack">
                    <div className="entity-meta-row">
                        <code>{promo.id}</code>
                        <button type="button" className="copy-chip" onClick={() => onCopy?.(promo.id, 'Promo ID')}>Copy promo ID</button>
                        {onAudit && <button type="button" className="copy-chip accent" onClick={() => onAudit(promo.id, 'promo_code')}>Promo audit</button>}
                    </div>
                </div>

                <div className="promo-risk-note">
                    <strong>Campaign guardrail</strong>
                    <span>Deactivate expired, abused, or incorrectly configured codes before sharing new campaign material.</span>
                </div>

                <div className="promo-drawer-actions">
                    {promo.is_active ? (
                        <button className="btn-action btn-ban" disabled={!canWrite} onClick={() => onDeactivate?.(promo)}>Deactivate promo</button>
                    ) : (
                        <span className="status-badge banned">Already inactive</span>
                    )}
                </div>
            </div>
        </div>
    );
}

// Main Dashboard
function AdminActionModal({ action, onCancel, onConfirm }) {
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');

    if (!action) return null;

    const submit = () => {
        const trimmed = reason.trim();
        if (action.requireReason !== false && trimmed.length < 5) {
            setError('Enter at least 5 characters so this action has a useful audit trail.');
            return;
        }
        onConfirm(trimmed);
    };

    return (
        <div className="admin-modal-overlay" role="presentation" onClick={onCancel}>
            <div className="admin-action-modal" role="dialog" aria-modal="true" aria-labelledby="admin-action-title" onClick={e => e.stopPropagation()}>
                <div className={`admin-modal-icon ${action.variant || 'default'}`}>{action.icon || '!'}</div>
                <div className="admin-modal-copy">
                    <h3 id="admin-action-title">{action.title}</h3>
                    {action.description && <p>{action.description}</p>}
                    {action.impact && <div className="admin-modal-impact">{action.impact}</div>}
                </div>
                <label className="admin-reason-label" htmlFor="admin-action-reason">Audit reason</label>
                <textarea
                    id="admin-action-reason"
                    className="admin-input admin-textarea admin-reason-input"
                    value={reason}
                    onChange={e => {
                        setReason(e.target.value);
                        if (error) setError('');
                    }}
                    placeholder={action.placeholder || 'Example: violates safety policy, duplicate fake profile, resolved report...'}
                    rows="4"
                    autoFocus
                />
                {error && <div className="admin-modal-error">{error}</div>}
                <div className="admin-modal-actions">
                    <button className="btn-action admin-modal-cancel" onClick={onCancel}>Cancel</button>
                    <button className={`btn-action admin-modal-confirm ${action.variant === 'danger' ? 'danger' : ''}`} onClick={submit}>
                        {action.confirmLabel || 'Confirm'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function AdminEmptyState({ title, body, actionLabel, onAction }) {
    return (
        <div className="admin-empty-state">
            <strong>{title}</strong>
            {body && <span>{body}</span>}
            {actionLabel && onAction && (
                <button type="button" className="btn-action" onClick={onAction}>
                    {actionLabel}
                </button>
            )}
        </div>
    );
}

function AdminCommandPalette({ open, query, commands, onQueryChange, onClose }) {
    if (!open) return null;
    const normalizedQuery = query.trim().toLowerCase();
    const visibleCommands = commands.filter(command => {
        if (!normalizedQuery) return true;
        return [command.label, command.description, command.group, ...(command.keywords || [])]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(normalizedQuery);
    });
    const firstCommandId = visibleCommands[0]?.id;

    return (
        <div className="admin-command-overlay" onMouseDown={onClose}>
            <div className="admin-command-palette" onMouseDown={event => event.stopPropagation()}>
                <div className="admin-command-search">
                    <div className="admin-command-search-meta">
                        <span>Command</span>
                        <strong>{visibleCommands.length} result{visibleCommands.length === 1 ? '' : 's'}</strong>
                    </div>
                    <input
                        autoFocus
                        className="admin-command-input"
                        value={query}
                        onChange={event => onQueryChange(event.target.value)}
                        onKeyDown={event => {
                            if (event.key === 'Escape') onClose();
                            if (event.key === 'Enter' && visibleCommands[0]) {
                                visibleCommands[0].run();
                                onClose();
                            }
                        }}
                        placeholder="Jump to users, payouts, audit, reports..."
                    />
                </div>
                <div className="admin-command-list">
                    {visibleCommands.length === 0 ? (
                        <AdminEmptyState
                            title="No matching command"
                            body="Try users, payouts, reports, audit, promo, push, or config."
                            actionLabel="Clear search"
                            onAction={() => onQueryChange('')}
                        />
                    ) : visibleCommands.map(command => (
                        <button
                            type="button"
                            className={`admin-command-item ${command.id === firstCommandId ? 'selected' : ''}`}
                            key={command.id}
                            onClick={() => {
                                command.run();
                                onClose();
                            }}
                        >
                            <span className="admin-command-token">{command.group}</span>
                            <span>
                                <strong>{command.label}</strong>
                                <small>{command.description}</small>
                            </span>
                        </button>
                    ))}
                </div>
                <div className="admin-command-footer">
                    <span>Enter opens first result</span>
                    <span>{normalizedQuery ? 'Clear search to show all' : `${commands.length} commands available`}</span>
                    <span>Esc closes</span>
                </div>
            </div>
        </div>
    );
}

function ActiveFilterChips({ filters }) {
    const activeFilters = filters.filter(filter => filter.value !== undefined && filter.value !== null && String(filter.value).trim() !== '');
    if (activeFilters.length === 0) return null;

    return (
        <div className="active-filter-chips">
            <span className="active-filter-label">Active filters</span>
            {activeFilters.map(filter => (
                <button
                    type="button"
                    className="active-filter-chip"
                    key={`${filter.label}-${filter.value}`}
                    onClick={filter.onClear}
                    title={`Clear ${filter.label}`}
                >
                    <span>{filter.label}: {filter.displayValue || filter.value}</span>
                    <strong aria-hidden="true">x</strong>
                </button>
            ))}
        </div>
    );
}

export default function AdminDashboard() {
    const { currentUser } = useAuth();
    const { addToast } = useToast();
    const actionResolverRef = useRef(null);
    const storedPrefsRef = useRef(readAdminPrefs());
    const [activeTab, setActiveTab] = useState(storedPrefsRef.current.activeTab || 'overview');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [adminAction, setAdminAction] = useState(null);
    const [adminAccess, setAdminAccess] = useState(null);
    const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
    const [commandQuery, setCommandQuery] = useState('');
    const [densityMode, setDensityMode] = useState(storedPrefsRef.current.densityMode || 'comfortable');
    const [workspaceLoadedAt, setWorkspaceLoadedAt] = useState({});

    // Overview State
    const [stats, setStats] = useState(null);
    const [opsSnapshot, setOpsSnapshot] = useState(null);
    const [loadingStats, setLoadingStats] = useState(false);

    // Analytics State
    const [analytics, setAnalytics] = useState(null);
    const [loadingAnalytics, setLoadingAnalytics] = useState(false);

    // User Management State
    const [searchQuery, setSearchQuery] = useState(storedPrefsRef.current.searchQuery || '');
    const [usersList, setUsersList] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState(new Set());
    const [viewUser, setViewUser] = useState(null);
    const [userTotal, setUserTotal] = useState(0);
    const [userPage, setUserPage] = useState(0);
    const [userFilters, setUserFilters] = useState({
        status: '',
        gender: '',
        university: '',
        verified: '',
        premium: '',
        ...storedPrefsRef.current.userFilters,
    });

    // Content Moderation State
    const [confessions, setConfessions] = useState([]);
    const [reports, setReports] = useState([]);
    const [loadingConfessions, setLoadingConfessions] = useState(false);
    const [contentSubTab, setContentSubTab] = useState(storedPrefsRef.current.contentSubTab || 'all');
    const [confessionTotal, setConfessionTotal] = useState(0);
    const [confessionPage, setConfessionPage] = useState(0);
    const [reportTotal, setReportTotal] = useState(0);
    const [pendingReportTotal, setPendingReportTotal] = useState(0);
    const [reportPage, setReportPage] = useState(0);
    const [moderationCase, setModerationCase] = useState(null);
    const [contentFilters, setContentFilters] = useState({
        search: '',
        university: '',
        reportStatus: 'pending',
        from: '',
        to: '',
        ...storedPrefsRef.current.contentFilters,
    });
    const [keywords, setKeywords] = useState([]);
    const [newKeyword, setNewKeyword] = useState('');
    const [keywordSearch, setKeywordSearch] = useState(storedPrefsRef.current.keywordSearch || '');

    // Finance State
    const [wallets, setWallets] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [transactionCase, setTransactionCase] = useState(null);
    const [withdrawals, setWithdrawals] = useState([]);
    const [payoutCase, setPayoutCase] = useState(null);
    const [payoutFilters, setPayoutFilters] = useState({
        search: '',
        status: '',
        from: '',
        to: '',
        ...storedPrefsRef.current.payoutFilters,
    });
    const [loadingFinance, setLoadingFinance] = useState(false);
    const [loadingTransactions, setLoadingTransactions] = useState(false);
    const [txnPage, setTxnPage] = useState(0);
    const [txnTotal, setTxnTotal] = useState(0);
    const [txnServerTotals, setTxnServerTotals] = useState(null);
    const [financeSubTab, setFinanceSubTab] = useState(storedPrefsRef.current.financeSubTab || 'payouts');
    const [promoCode, setPromoCode] = useState('');
    const [promoDiscount, setPromoDiscount] = useState(10);
    const [promoMaxUses, setPromoMaxUses] = useState(100);
    const [promoCodes, setPromoCodes] = useState([]);
    const [promoCase, setPromoCase] = useState(null);
    const [promoFilters, setPromoFilters] = useState({
        search: '',
        status: '',
        ...storedPrefsRef.current.promoFilters,
    });
    const [txnFilter, setTxnFilter] = useState({
        search: '',
        university: '',
        gender: '',
        type: '',
        status: '',
        source: '',
        from: '',
        to: '',
        ...storedPrefsRef.current.txnFilter,
    });

    // App Controls State
    const [appConfig, setAppConfig] = useState({});
    const [loadingConfig, setLoadingConfig] = useState(false);
    const [pushTitle, setPushTitle] = useState('');
    const [pushBody, setPushBody] = useState('');
    const [pushUrl, setPushUrl] = useState('/notifications');
    const [pushSegment, setPushSegment] = useState('all');
    const [pushPreview, setPushPreview] = useState(null);
    const [pushHistory, setPushHistory] = useState([]);
    const [isPushing, setIsPushing] = useState(false);
    const [bannerText, setBannerText] = useState('');
    const [swipeLimit, setSwipeLimit] = useState(10);
    const [adminAccessList, setAdminAccessList] = useState([]);
    const [adminAccessTargetId, setAdminAccessTargetId] = useState('');
    const [adminAccessMode, setAdminAccessMode] = useState('restricted_admin');
    const [adminAccessPermissions, setAdminAccessPermissions] = useState(['users:read', 'audit:read']);
    const [savingAdminAccess, setSavingAdminAccess] = useState(false);

    // Audit State
    const [auditLogs, setAuditLogs] = useState([]);
    const [loadingAudit, setLoadingAudit] = useState(false);
    const [auditTotal, setAuditTotal] = useState(0);
    const [auditPage, setAuditPage] = useState(0);
    const [expandedAuditId, setExpandedAuditId] = useState(null);
    const [auditFilters, setAuditFilters] = useState({
        search: '',
        action: '',
        targetType: '',
        admin: '',
        from: '',
        to: '',
        ...storedPrefsRef.current.auditFilters,
    });

    const adminPermissions = Array.isArray(adminAccess?.permissions) ? adminAccess.permissions : ['*'];
    const hasAdminPermission = (permission) => adminPermissions.includes('*') || adminPermissions.includes(permission);
    const adminPermissionFlags = {
        broadcastPush: hasAdminPermission('push:broadcast'),
        moderateUsers: hasAdminPermission('users:moderate'),
        moderateContent: hasAdminPermission('content:moderate'),
        reviewPayouts: hasAdminPermission('finance:payouts'),
        readAudit: hasAdminPermission('audit:read'),
        writeConfig: hasAdminPermission('config:write'),
        writePromo: hasAdminPermission('promo:write'),
        manageAdminAccess: adminAccess?.isOwner === true,
    };
    adminPermissionFlags.readFinance = hasAdminPermission('finance:read') || adminPermissionFlags.reviewPayouts;
    adminPermissionFlags.readUsers = hasAdminPermission('users:read') || adminPermissionFlags.moderateUsers;

    useEffect(() => {
        loadAdminAccess();
        if (activeTab === 'overview') loadStats();
        else if (activeTab === 'analytics') loadAnalytics();
        else if (activeTab === 'users') searchUsers(0);
        else if (activeTab === 'content') loadConfessions();
        else if (activeTab === 'finance') loadFinance();
        else if (activeTab === 'controls') loadConfig();
        else if (activeTab === 'audit') loadAuditLogs();
        // Auto-close sidebar on mobile when tab changes
        if (window.innerWidth <= 768) setIsSidebarOpen(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === 'controls' && adminAccess?.isOwner) {
            loadAdminAccessList();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, adminAccess?.isOwner]);

    // Data Loaders

    const loadAdminAccess = async () => {
        if (adminAccess) return;
        try {
            const { data, error } = await supabase.rpc('admin_get_my_access');
            if (error) throw error;
            setAdminAccess(data || null);
        } catch (err) {
            console.error('Admin access load error:', err);
        }
    };

    const loadStats = async () => {
        setLoadingStats(true);
        try {
            const [{ data: dashboardStats, error: statsError }, { data: snapshot, error: snapshotError }] = await Promise.all([
                adminPermissionFlags.readFinance ? supabase.rpc('admin_get_dashboard_stats') : Promise.resolve({ data: null, error: null }),
                supabase.rpc('admin_get_ops_snapshot'),
            ]);
            if (statsError) throw statsError;
            if (snapshotError) throw snapshotError;
            setStats(dashboardStats);
            setOpsSnapshot(snapshot || null);
            setWorkspaceLoadedAt(prev => ({ ...prev, overview: new Date().toISOString() }));
        } catch (err) {
            console.error('Failed to load stats:', err);
        } finally { setLoadingStats(false); }
    };

    const loadOpsSnapshot = async () => {
        try {
            const { data, error } = await supabase.rpc('admin_get_ops_snapshot');
            if (error) throw error;
            setOpsSnapshot(data || null);
        } catch (err) {
            console.error('Failed to load ops snapshot:', err);
        }
    };

    const loadAnalytics = async () => {
        if (!adminPermissionFlags.readFinance) {
            addToast('Your admin role does not include finance analytics.', 'error');
            return;
        }
        setLoadingAnalytics(true);
        try {
            const { data, error } = await supabase.rpc('admin_get_analytics');
            if (error) throw error;
            setAnalytics(data);
            setWorkspaceLoadedAt(prev => ({ ...prev, analytics: new Date().toISOString() }));
        } catch (err) {
            console.error('Analytics error:', err);
            addToast('Could not load analytics', 'error');
        } finally { setLoadingAnalytics(false); }
    };

    const searchUsers = async (page = userPage, q = searchQuery, filters = userFilters) => {
        if (!adminPermissionFlags.readUsers) {
            addToast('Your admin role does not include user read access.', 'error');
            return;
        }
        setLoadingUsers(true);
        try {
            const { data, error } = await supabase.rpc('admin_search_users', {
                p_limit: USER_PAGE_SIZE,
                p_offset: page * USER_PAGE_SIZE,
                p_query: q.trim() || null,
                p_status: filters.status || null,
                p_gender: filters.gender || null,
                p_university: filters.university.trim() || null,
                p_verified: filters.verified === '' ? null : filters.verified === 'true',
                p_premium: filters.premium === '' ? null : filters.premium === 'true',
            });
            if (error) throw error;
            setUsersList(data || []);
            setUserTotal(Number(data?.[0]?.total_count || 0));
            setUserPage(page);
            setSelectedUsers(new Set());
            setWorkspaceLoadedAt(prev => ({ ...prev, users: new Date().toISOString() }));
        } catch (err) {
            console.error('Failed to load users:', err);
            addToast('Could not load users', 'error');
        } finally { setLoadingUsers(false); }
    };

    const loadConfessions = async (
        confessionPageArg = confessionPage,
        reportPageArg = reportPage,
        filters = contentFilters
    ) => {
        if (!adminPermissionFlags.moderateContent) {
            addToast('Your admin role does not include content moderation access.', 'error');
            return;
        }
        setLoadingConfessions(true);
        try {
            const fromDate = filters.from ? new Date(`${filters.from}T00:00:00`).toISOString() : null;
            const toDate = filters.to ? new Date(`${filters.to}T23:59:59.999`).toISOString() : null;
            const [{ data: c, error: ce }, { data: r, error: re }, { data: pendingReports, error: pe }] = await Promise.all([
                supabase.rpc('admin_get_confessions', {
                    p_limit: CONTENT_PAGE_SIZE,
                    p_offset: confessionPageArg * CONTENT_PAGE_SIZE,
                    p_search: filters.search.trim() || null,
                    p_university: filters.university.trim() || null,
                    p_from: fromDate,
                    p_to: toDate,
                }),
                supabase.rpc('admin_get_confession_reports', {
                    p_limit: CONTENT_PAGE_SIZE,
                    p_offset: reportPageArg * CONTENT_PAGE_SIZE,
                    p_status: filters.reportStatus || null,
                    p_search: filters.search.trim() || null,
                    p_from: fromDate,
                    p_to: toDate,
                }),
                supabase.rpc('admin_get_confession_reports', {
                    p_limit: 1,
                    p_offset: 0,
                    p_status: 'pending',
                    p_search: null,
                    p_from: null,
                    p_to: null,
                }),
            ]);
            if (ce) throw ce;
            if (re) throw re;
            if (pe) throw pe;
            setConfessions(c || []);
            setConfessionTotal(Number(c?.[0]?.total_count || 0));
            setConfessionPage(confessionPageArg);
            setReports((r || []).map(report => ({
                ...report,
                confessions: {
                    content: report.confession_content,
                    university: report.confession_university,
                    created_at: report.confession_created_at,
                },
            })));
            setReportTotal(Number(r?.[0]?.total_count || 0));
            const pendingCount = Number(pendingReports?.[0]?.total_count || 0);
            setPendingReportTotal(pendingCount);
            setOpsSnapshot(prev => prev ? { ...prev, pendingReports: pendingCount } : prev);
            setReportPage(reportPageArg);
            const { data: configRows, error: configError } = await supabase.rpc('admin_get_app_config');
            if (configError) throw configError;
            const keywordConfig = (configRows || []).find(row => row.key === 'banned_keywords');
            setKeywords(Array.isArray(keywordConfig?.value) ? keywordConfig.value : []);
            setWorkspaceLoadedAt(prev => ({ ...prev, content: new Date().toISOString() }));
        } catch (err) {
            console.error('Content error:', err);
            addToast('Could not load moderation queues', 'error');
        } finally { setLoadingConfessions(false); }
    };

    const loadFinance = async (filters = payoutFilters) => {
        if (!adminPermissionFlags.readFinance && !adminPermissionFlags.writePromo) {
            addToast('Your admin role does not include finance or promo access.', 'error');
            return;
        }
        setLoadingFinance(true);
        try {
            if (!adminPermissionFlags.readFinance && adminPermissionFlags.writePromo) {
                const { data: promo, error } = await supabase.rpc('admin_get_promo_codes');
                if (error) throw error;
                setWallets([]);
                setWithdrawals([]);
                setTransactions([]);
                setPromoCodes(promo || []);
                setWorkspaceLoadedAt(prev => ({ ...prev, finance: new Date().toISOString() }));
                return;
            }
            const [{ data: w, error: we }, promoResult, { data: wd, error: wde }] = await Promise.all([
                supabase.rpc('admin_get_wallets'),
                adminPermissionFlags.writePromo ? supabase.rpc('admin_get_promo_codes') : Promise.resolve({ data: [], error: null }),
                supabase.rpc('admin_get_withdrawals', { p_limit: 100, p_offset: 0, p_status: filters.status || null }),
            ]);
            if (we) throw we;
            if (wde) throw wde;
            if (promoResult.error) throw promoResult.error;
            setWallets(w || []);
            setPromoCodes(promoResult.data || []);
            setWithdrawals(wd || []);
            const pending = (wd || []).filter(item => item.status === 'pending');
            setOpsSnapshot(prev => prev ? {
                ...prev,
                pendingWithdrawals: pending.length,
                pendingWithdrawalAmount: pending.reduce((sum, item) => sum + Number(item.amount || 0), 0),
            } : prev);
            await loadTransactions(0);
            setWorkspaceLoadedAt(prev => ({ ...prev, finance: new Date().toISOString() }));
        } catch (err) {
            console.error('Finance error:', err);
            addToast('Could not load finance data', 'error');
        } finally { setLoadingFinance(false); }
    };

    const loadTransactions = async (page = txnPage, filters = txnFilter) => {
        if (!adminPermissionFlags.readFinance) return;
        setLoadingTransactions(true);
        try {
            const fromDate = filters.from ? new Date(`${filters.from}T00:00:00`).toISOString() : null;
            const toDate = filters.to ? new Date(`${filters.to}T23:59:59.999`).toISOString() : null;
            const { data, error } = await supabase.rpc('admin_get_transactions', {
                p_limit: TRANSACTION_PAGE_SIZE,
                p_offset: page * TRANSACTION_PAGE_SIZE,
                p_search: filters.search.trim() || null,
                p_university: filters.university.trim() || null,
                p_gender: filters.gender || null,
                p_type: filters.type || null,
                p_status: filters.status || null,
                p_source: filters.source || null,
                p_from: fromDate,
                p_to: toDate,
            });
            if (error) throw error;
            setTransactions(data || []);
            setTxnTotal(Number(data?.[0]?.total_count || 0));
            setTxnServerTotals(data?.[0] ? {
                count: Number(data[0].total_count || 0),
                total: Number(data[0].total_amount || 0),
                credit: Number(data[0].credit_amount || 0),
                debit: Number(data[0].debit_amount || 0),
            } : null);
            setTxnPage(page);
            setWorkspaceLoadedAt(prev => ({ ...prev, finance: new Date().toISOString() }));
        } catch (err) {
            console.error('Transaction ledger error:', err);
            addToast('Could not load transaction ledger', 'error');
        } finally {
            setLoadingTransactions(false);
        }
    };

    const loadConfig = async () => {
        setLoadingConfig(true);
        try {
            const [configResult, broadcastResult, accessResult] = await Promise.all([
                adminPermissionFlags.writeConfig
                    ? supabase.rpc('admin_get_app_config')
                    : Promise.resolve({ data: [], error: null }),
                adminPermissionFlags.broadcastPush || adminPermissionFlags.readAudit
                    ? supabase.rpc('admin_get_push_broadcasts', { p_limit: 8 })
                    : Promise.resolve({ data: [], error: null }),
                adminAccess?.isOwner
                    ? supabase.rpc('admin_get_admin_access_list')
                    : Promise.resolve({ data: [], error: null }),
            ]);
            if (configResult.error) throw configResult.error;
            if (broadcastResult.error) throw broadcastResult.error;
            if (accessResult.error) throw accessResult.error;
            const map = {};
            (configResult.data || []).forEach(item => { map[item.key] = item.value; });
            setAppConfig(map);
            setPushHistory(broadcastResult.data || []);
            setAdminAccessList(accessResult.data || []);
            setBannerText(map['banner_message'] || '');
            setSwipeLimit(Number(map['free_daily_swipes']) || 10);
            setWorkspaceLoadedAt(prev => ({ ...prev, controls: new Date().toISOString() }));
        } catch (err) {
            console.error('Config error:', err);
        } finally { setLoadingConfig(false); }
    };

    const loadAdminAccessList = async () => {
        if (!adminAccess?.isOwner) return;
        try {
            const { data, error } = await supabase.rpc('admin_get_admin_access_list');
            if (error) throw error;
            setAdminAccessList(data || []);
        } catch (err) {
            console.error('Admin access list error:', err);
            addToast('Could not load admin access list', 'error');
        }
    };

    const loadPushHistory = async () => {
        if (!adminPermissionFlags.broadcastPush && !adminPermissionFlags.readAudit) return;
        try {
            const { data, error } = await supabase.rpc('admin_get_push_broadcasts', { p_limit: 8 });
            if (error) throw error;
            setPushHistory(data || []);
        } catch (err) {
            console.error('Push history error:', err);
        }
    };

    // Actions

    const loadAuditLogs = async (page = auditPage, filters = auditFilters) => {
        if (!adminPermissionFlags.readAudit) {
            addToast('Your admin role does not include audit log access.', 'error');
            return;
        }
        setLoadingAudit(true);
        try {
            const fromDate = filters.from ? new Date(`${filters.from}T00:00:00`).toISOString() : null;
            const toDate = filters.to ? new Date(`${filters.to}T23:59:59.999`).toISOString() : null;
            const { data, error } = await supabase.rpc('admin_get_audit_logs', {
                p_limit: AUDIT_PAGE_SIZE,
                p_offset: page * AUDIT_PAGE_SIZE,
                p_action: filters.action || null,
                p_target_type: filters.targetType || null,
                p_admin_query: filters.admin.trim() || null,
                p_search: filters.search.trim() || null,
                p_from: fromDate,
                p_to: toDate,
            });
            if (error) throw error;
            setAuditLogs(data || []);
            const total = Number(data?.[0]?.total_count || 0);
            setAuditTotal(total);
            setOpsSnapshot(prev => prev ? { ...prev, auditRecords: total } : prev);
            setAuditPage(page);
            setWorkspaceLoadedAt(prev => ({ ...prev, audit: new Date().toISOString() }));
        } catch (err) {
            console.error('Audit log error:', err);
            addToast('Could not load audit logs', 'error');
        } finally { setLoadingAudit(false); }
    };

    const updateAuditFilter = (key, value) => {
        setAuditFilters(prev => ({ ...prev, [key]: value }));
    };

    const applyAuditFilters = () => loadAuditLogs(0);

    const resetAuditFilters = () => {
        const clearedFilters = {
            search: '',
            action: '',
            targetType: '',
            admin: '',
            from: '',
            to: '',
        };
        setAuditFilters(clearedFilters);
        setAuditPage(0);
        loadAuditLogs(0, clearedFilters);
    };

    const applyAuditQuickFilter = (filters) => {
        const nextFilters = {
            search: '',
            action: '',
            targetType: '',
            admin: '',
            from: '',
            to: '',
            ...filters,
        };
        setAuditFilters(nextFilters);
        setAuditPage(0);
        loadAuditLogs(0, nextFilters);
    };

    const updatePayoutFilter = (key, value) => {
        setPayoutFilters(prev => ({ ...prev, [key]: value }));
    };

    const applyPayoutFilters = () => loadFinance(payoutFilters);

    const resetPayoutFilters = () => {
        const clearedFilters = { search: '', status: '', from: '', to: '' };
        setPayoutFilters(clearedFilters);
        loadFinance(clearedFilters);
    };

    const updatePromoFilter = (key, value) => {
        setPromoFilters(prev => ({ ...prev, [key]: value }));
    };

    const resetPromoFilters = () => {
        setPromoFilters({ search: '', status: '' });
    };

    const resetAdminWorkspace = () => {
        const clearedUserFilters = { status: '', gender: '', university: '', verified: '', premium: '' };
        const clearedContentFilters = { search: '', university: '', reportStatus: 'pending', from: '', to: '' };
        const clearedPayoutFilters = { search: '', status: '', from: '', to: '' };
        const clearedPromoFilters = { search: '', status: '' };
        const clearedTxnFilter = { search: '', university: '', gender: '', type: '', status: '', source: '', from: '', to: '' };
        const clearedAuditFilters = { search: '', action: '', targetType: '', admin: '', from: '', to: '' };

        clearAdminPrefs();
        setSearchQuery('');
        setUserFilters(clearedUserFilters);
        setUserPage(0);
        setContentSubTab('all');
        setContentFilters(clearedContentFilters);
        setConfessionPage(0);
        setReportPage(0);
        setFinanceSubTab(adminPermissionFlags.readFinance ? 'payouts' : 'promo');
        setPayoutFilters(clearedPayoutFilters);
        setPromoFilters(clearedPromoFilters);
        setTxnFilter(clearedTxnFilter);
        setTxnPage(0);
        setAuditFilters(clearedAuditFilters);
        setAuditPage(0);
        setKeywordSearch('');
        setExpandedAuditId(null);
        setDensityMode('comfortable');
        setActiveTab('overview');
        addToast('Admin workspace filters reset', 'success');
    };

    const handleConfigToggle = async (key, newValue, reason) => {
        if (!requireAdminPermission(adminPermissionFlags.writeConfig, 'config write')) return;
        try {
            const { error } = await supabase.rpc('admin_set_app_config', {
                p_key: key,
                p_value: newValue,
                p_reason: reason,
            });
            if (error) throw error;
            setAppConfig(prev => ({ ...prev, [key]: newValue }));
            addToast('Configuration updated', 'success');
        } catch { addToast('Config update failed', 'error'); }
    };

    const openAdminAction = (options) => new Promise(resolve => {
        actionResolverRef.current = resolve;
        setAdminAction(options);
    });

    const closeAdminAction = (reason = null) => {
        if (actionResolverRef.current) {
            actionResolverRef.current(reason);
            actionResolverRef.current = null;
        }
        setAdminAction(null);
    };

    const requestAdminReason = async (options) => {
        const reason = await openAdminAction(options);
        return reason?.trim() || null;
    };

    const copyToClipboard = async (value, label = 'Value') => {
        const text = String(value || '').trim();
        if (!text) return addToast(`No ${label.toLowerCase()} to copy`, 'error');
        try {
            if (navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                const area = document.createElement('textarea');
                area.value = text;
                area.setAttribute('readonly', '');
                area.style.position = 'fixed';
                area.style.opacity = '0';
                document.body.appendChild(area);
                area.select();
                document.execCommand('copy');
                area.remove();
            }
            addToast(`${label} copied`, 'success');
        } catch (err) {
            console.error('Copy failed:', err);
            addToast(`Could not copy ${label.toLowerCase()}`, 'error');
        }
    };

    const getConfigSnapshotRows = () => {
        const flagRows = configFlagRows.map(([key, label]) => ({
            section: 'Feature flag',
            key,
            label,
            value: isConfigOn(key) ? 'on' : 'off',
        }));
        return [
            ...flagRows,
            { section: 'App setting', key: 'free_daily_swipes', label: 'Free daily swipes', value: Number(swipeLimit) },
            { section: 'App setting', key: 'banner_active', label: 'Announcement banner active', value: isConfigOn('banner_active') ? 'on' : 'off' },
            { section: 'App setting', key: 'banner_message', label: 'Announcement banner message', value: bannerText || '' },
        ];
    };

    const copyConfigSnapshot = () => {
        const snapshot = {
            generatedAt: new Date().toISOString(),
            generatedBy: currentUser?.email || currentUser?.id || 'admin',
            values: getConfigSnapshotRows(),
        };
        copyToClipboard(JSON.stringify(snapshot, null, 2), 'Config snapshot');
    };

    const exportConfigSnapshot = () => {
        const rows = getConfigSnapshotRows();
        const headers = ['Section', 'Key', 'Label', 'Value'];
        const csv = [headers, ...rows.map(row => [row.section, row.key, row.label, row.value])]
            .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `college-date-config-snapshot-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        addToast('Exported config snapshot', 'success');
    };

    const getAdminAccessRows = () => adminAccessList.map(admin => {
        const permissions = Array.isArray(admin.permissions) ? admin.permissions.filter(Boolean) : [];
        return {
            userId: admin.user_id || '',
            name: admin.full_name || '',
            email: admin.email || '',
            role: admin.role || 'admin',
            mode: admin.permission_mode || (permissions.length > 0 ? 'explicit_permissions' : 'legacy'),
            permissions: permissions.length > 0 ? permissions.join(' / ') : 'All permissions',
        };
    });

    const copyAdminAccessSummary = () => {
        if (adminAccessList.length === 0) return addToast('No admin access rows to copy', 'error');
        const summary = {
            generatedAt: new Date().toISOString(),
            generatedBy: currentUser?.email || currentUser?.id || 'admin',
            admins: getAdminAccessRows(),
        };
        copyToClipboard(JSON.stringify(summary, null, 2), 'Admin access summary');
    };

    const exportAdminAccessList = () => {
        if (adminAccessList.length === 0) return addToast('No admin access rows to export', 'error');
        const headers = ['User ID', 'Name', 'Email', 'Role', 'Permission Mode', 'Permissions'];
        const rows = getAdminAccessRows().map(row => [row.userId, row.name, row.email, row.role, row.mode, row.permissions]);
        const csv = [headers, ...rows]
            .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `college-date-admin-access-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        addToast(`Exported ${adminAccessList.length} admin access rows`, 'success');
    };

    const getPushHistoryRows = () => pushHistory.map(item => ({
        id: item.id || '',
        createdAt: item.created_at || '',
        title: item.title || '',
        body: item.body || '',
        segment: pushSegmentLabels[item.segment] || item.segment || '',
        status: item.status || '',
        mode: item.test_mode ? 'test' : 'broadcast',
        targetUsers: Number(item.target_user_count || 0),
        targetDevices: Number(item.target_device_count || 0),
        sentBy: item.sent_by || '',
        error: item.error_message || '',
    }));

    const copyPushHistorySummary = () => {
        if (pushHistory.length === 0) return addToast('No push history to copy', 'error');
        const summary = {
            generatedAt: new Date().toISOString(),
            generatedBy: currentUser?.email || currentUser?.id || 'admin',
            broadcasts: getPushHistoryRows(),
        };
        copyToClipboard(JSON.stringify(summary, null, 2), 'Push history');
    };

    const exportPushHistory = () => {
        if (pushHistory.length === 0) return addToast('No push history to export', 'error');
        const headers = ['Created At', 'Title', 'Body', 'Segment', 'Mode', 'Status', 'Target Users', 'Target Devices', 'Sent By', 'Error', 'Broadcast ID'];
        const rows = getPushHistoryRows().map(row => [
            row.createdAt,
            row.title,
            row.body,
            row.segment,
            row.mode,
            row.status,
            row.targetUsers,
            row.targetDevices,
            row.sentBy,
            row.error,
            row.id,
        ]);
        const csv = [headers, ...rows]
            .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `college-date-push-history-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        addToast(`Exported ${pushHistory.length} push broadcast rows`, 'success');
    };

    const prepareAdminAccessTarget = (user) => {
        if (!adminPermissionFlags.manageAdminAccess) return;
        setAdminAccessTargetId(user.id);
        setAdminAccessMode('restricted_admin');
        setActiveTab('controls');
        addToast('Admin access target filled from user table', 'success');
    };

    const openAuditTrail = (targetId, targetType = '') => {
        if (!requireAdminPermission(adminPermissionFlags.readAudit, 'audit log access')) return;
        const nextFilters = {
            search: String(targetId || '').trim(),
            action: '',
            targetType,
            admin: '',
            from: '',
            to: '',
        };
        setAuditFilters(nextFilters);
        setAuditPage(0);
        setActiveTab('audit');
        loadAuditLogs(0, nextFilters);
    };

    const requireAdminPermission = (allowed, label) => {
        if (allowed) return true;
        addToast(`Your admin role does not include ${label}.`, 'error');
        return false;
    };

    const applyUserStatus = async (userId, actionType, newStatus, reason) => {
        if (!requireAdminPermission(adminPermissionFlags.moderateUsers, 'user moderation')) return;
        const { error } = await supabase.rpc('admin_set_user_status', {
            p_user_id: userId,
            p_action: actionType,
            p_status: newStatus,
            p_reason: reason,
        });
        if (error) throw error;

        setUsersList(prev => prev.map(u => (
            u.id === userId ? { ...u, [userStatusField[actionType]]: newStatus } : u
        )));
        setViewUser(prev => prev?.id === userId ? { ...prev, [userStatusField[actionType]]: newStatus } : prev);
    };

    const toggleUserStatus = async (userId, actionType, newStatus) => {
        if (!requireAdminPermission(adminPermissionFlags.moderateUsers, 'user moderation')) return;
        const user = usersList.find(u => u.id === userId);
        const label = userStatusLabels[actionType]?.[newStatus ? 'on' : 'off'] || 'Update user';
        const reason = await requestAdminReason({
            title: label,
            description: user ? `${user.full_name || 'This user'} (${user.email || 'no email'})` : 'Update this user status.',
            impact: actionType === 'ban'
                ? 'Ban status affects whether the user can safely remain visible and active in the app.'
                : actionType === 'shadow'
                    ? 'Shadow-ban status hides or limits the user without obvious feedback to them.'
                    : 'Verification changes public trust signals shown around this profile.',
            confirmLabel: label,
            variant: actionType === 'verify' && newStatus ? 'default' : 'danger',
        });
        if (!reason) return;

        try {
            await applyUserStatus(userId, actionType, newStatus, reason);
            addToast('User status updated', 'success');
        } catch (err) { addToast(`Action failed: ${err.message}`, 'error'); }
    };

    const bulkAction = async (actionType) => {
        if (!requireAdminPermission(adminPermissionFlags.moderateUsers, 'user moderation')) return;
        if (selectedUsers.size === 0) return addToast('No users selected', 'error');
        const reason = await requestAdminReason({
            title: `Bulk ${actionType} ${selectedUsers.size} users`,
            description: 'This will apply the status toggle to every selected user in the current table.',
            impact: 'Bulk changes are audited once per affected user and can materially change the live user experience.',
            confirmLabel: `Apply to ${selectedUsers.size}`,
            variant: actionType === 'verify' ? 'default' : 'danger',
        });
        if (!reason) return;

        let success = 0;
        for (const uid of selectedUsers) {
            const user = usersList.find(u => u.id === uid);
            if (!user) continue;
            try {
                const status = actionType === 'ban' ? !user.is_banned : actionType === 'shadow' ? !user.is_shadow_banned : !user.is_verified;
                await applyUserStatus(uid, actionType, status, reason);
                success++;
            } catch (err) {
                console.error('Bulk user update failed:', err);
            }
        }
        addToast(`Updated ${success} users`, 'success');
        setSelectedUsers(new Set());
    };

    const handleDeleteConfession = async (confession) => {
        if (!requireAdminPermission(adminPermissionFlags.moderateContent, 'content moderation')) return;
        const reason = await requestAdminReason({
            title: 'Delete confession',
            description: confession?.content ? `"${confession.content.slice(0, 140)}${confession.content.length > 140 ? '...' : ''}"` : 'Delete this confession.',
            impact: 'This removes the confession from the live app and records the reason in the admin audit log.',
            confirmLabel: 'Delete confession',
            variant: 'danger',
        });
        if (!reason) return;

        try {
            const { error } = await supabase.rpc('admin_moderate_confession', {
                p_confession_id: confession.id,
                p_action: 'delete',
                p_note: reason,
            });
            if (error) throw error;
            setConfessions(prev => prev.filter(c => c.id !== confession.id));
            setModerationCase(prev => prev?.item?.id === confession.id ? null : prev);
            setConfessionTotal(prev => Math.max(0, prev - 1));
            addToast('Confession deleted', 'success');
        } catch { addToast('Delete failed', 'error'); }
    };

    const handleDismissReport = async (report) => {
        if (!requireAdminPermission(adminPermissionFlags.moderateContent, 'content moderation')) return;
        const reason = await requestAdminReason({
            title: 'Dismiss report',
            description: `Reported reason: ${report.reason || 'No reason supplied'}`,
            impact: 'This marks the report as dismissed and leaves the confession visible.',
            confirmLabel: 'Dismiss report',
            variant: 'default',
        });
        if (!reason) return;

        try {
            const { error } = await supabase.rpc('admin_review_confession_report', {
                p_report_id: report.id,
                p_action: 'dismiss',
                p_note: reason,
            });
            if (error) throw error;
            setReports(prev => prev.filter(r => r.id !== report.id));
            if (report.status === 'pending') {
                setPendingReportTotal(prev => Math.max(0, prev - 1));
                setOpsSnapshot(prev => prev ? {
                    ...prev,
                    pendingReports: Math.max(0, Number(prev.pendingReports || 0) - 1),
                } : prev);
            }
            setReportTotal(prev => Math.max(0, prev - 1));
            setModerationCase(prev => prev?.item?.id === report.id ? null : prev);
            addToast('Report dismissed', 'success');
        } catch { addToast('Error', 'error'); }
    };

    const handleDeleteReported = async (report) => {
        if (!requireAdminPermission(adminPermissionFlags.moderateContent, 'content moderation')) return;
        const reason = await requestAdminReason({
            title: 'Delete reported confession',
            description: report.confessions?.content ? `"${report.confessions.content.slice(0, 140)}${report.confessions.content.length > 140 ? '...' : ''}"` : 'Delete this reported confession.',
            impact: 'This removes the confession and closes the report as reviewed.',
            confirmLabel: 'Delete post',
            variant: 'danger',
        });
        if (!reason) return;

        try {
            const { error } = await supabase.rpc('admin_review_confession_report', {
                p_report_id: report.id,
                p_action: 'delete_post',
                p_note: reason,
            });
            if (error) throw error;
            setConfessions(prev => prev.filter(c => c.id !== report.confession_id));
            setReports(prev => prev.filter(r => r.id !== report.id));
            setConfessionTotal(prev => Math.max(0, prev - 1));
            if (report.status === 'pending') {
                setPendingReportTotal(prev => Math.max(0, prev - 1));
                setOpsSnapshot(prev => prev ? {
                    ...prev,
                    pendingReports: Math.max(0, Number(prev.pendingReports || 0) - 1),
                } : prev);
            }
            setReportTotal(prev => Math.max(0, prev - 1));
            setModerationCase(prev => prev?.item?.id === report.id || prev?.item?.id === report.confession_id ? null : prev);
            addToast('Reported confession deleted', 'success');
        } catch {
            addToast('Delete failed', 'error');
        }
    };

    const updateContentFilter = (key, value) => {
        setContentFilters(prev => ({ ...prev, [key]: value }));
    };

    const applyContentFilters = () => loadConfessions(0, 0);

    const resetContentFilters = () => {
        const clearedFilters = {
            search: '',
            university: '',
            reportStatus: 'pending',
            from: '',
            to: '',
        };
        setContentFilters(clearedFilters);
        loadConfessions(0, 0, clearedFilters);
    };

    const addKeyword = async () => {
        if (!requireAdminPermission(adminPermissionFlags.writeConfig, 'config write')) return;
        const keyword = newKeyword.trim().toLowerCase();
        if (!keyword) return;
        if (keywords.includes(keyword)) return addToast('Keyword already exists', 'error');
        const reason = await requestAdminReason({
            title: 'Add banned keyword',
            description: `Add "${keyword}" to the moderation keyword list.`,
            impact: 'Future matching content may be flagged or blocked depending on moderation rules.',
            confirmLabel: 'Add keyword',
            placeholder: 'Example: spam phrase, safety policy term, abuse pattern...',
        });
        if (!reason) return;

        const updated = [...keywords, keyword];
        try {
            const { error } = await supabase.rpc('admin_set_app_config', {
                p_key: 'banned_keywords',
                p_value: updated,
                p_reason: reason,
            });
            if (error) throw error;
            setKeywords(updated);
            setNewKeyword('');
            addToast('Keyword added', 'success');
        } catch { addToast('Error', 'error'); }
    };

    const removeKeyword = async (kw) => {
        if (!requireAdminPermission(adminPermissionFlags.writeConfig, 'config write')) return;
        const reason = await requestAdminReason({
            title: 'Remove banned keyword',
            description: `Remove "${kw}" from the moderation keyword list.`,
            impact: 'Future content containing this term may no longer be flagged by keyword rules.',
            confirmLabel: 'Remove keyword',
            variant: 'danger',
            placeholder: 'Example: false-positive term, outdated rule, policy adjustment...',
        });
        if (!reason) return;

        const updated = keywords.filter(k => k !== kw);
        try {
            const { error } = await supabase.rpc('admin_set_app_config', {
                p_key: 'banned_keywords',
                p_value: updated,
                p_reason: reason,
            });
            if (error) throw error;
            setKeywords(updated);
        } catch { addToast('Error', 'error'); }
    };

    const createPromoCode = async () => {
        if (!requireAdminPermission(adminPermissionFlags.writePromo, 'promo write')) return;
        if (!promoCode.trim()) return addToast('Enter a promo code', 'error');
        try {
            const { error } = await supabase.rpc('admin_create_promo_code', {
                p_code: promoCode.toUpperCase().trim(),
                p_discount_percent: Number(promoDiscount),
                p_max_uses: Number(promoMaxUses),
            });
            if (error) throw error;
            addToast('Promo code created!', 'success');
            setPromoCode('');
            const { data } = await supabase.rpc('admin_get_promo_codes');
            setPromoCodes(data || []);
        } catch (err) { addToast(`Error: ${err.message}`, 'error'); }
    };

    const deactivatePromo = async (promo) => {
        if (!requireAdminPermission(adminPermissionFlags.writePromo, 'promo write')) return;
        const reason = await requestAdminReason({
            title: 'Deactivate promo code',
            description: `Deactivate ${promo.code}.`,
            impact: 'Users will no longer be able to redeem this promo code.',
            confirmLabel: 'Deactivate promo',
            variant: 'danger',
            placeholder: 'Example: campaign ended, abuse detected, wrong discount value...',
        });
        if (!reason) return;

        const { error } = await supabase.rpc('admin_deactivate_promo_code', {
            p_promo_id: promo.id,
            p_reason: reason,
        });
        if (error) return addToast(`Error: ${error.message}`, 'error');
        setPromoCodes(prev => prev.map(p => p.id === promo.id ? { ...p, is_active: false } : p));
        setPromoCase(prev => prev?.id === promo.id ? { ...prev, is_active: false } : prev);
        addToast('Promo code deactivated', 'success');
    };

    const reviewWithdrawal = async (withdrawal, decision) => {
        if (!requireAdminPermission(adminPermissionFlags.reviewPayouts, 'payout review')) return;
        const isApprove = decision === 'approve';
        const reason = await requestAdminReason({
            title: isApprove ? 'Approve payout' : 'Reject payout',
            description: `${withdrawal.full_name || 'User'} requested ${fmtCurrency(withdrawal.amount)}.`,
            impact: isApprove
                ? 'Approval marks the payout as approved and removes the amount from pending liability.'
                : 'Rejection refunds the amount from pending balance back to the user available balance.',
            confirmLabel: isApprove ? 'Approve payout' : 'Reject payout',
            variant: isApprove ? 'default' : 'danger',
            placeholder: isApprove ? 'Example: verified bank details and payout batch reference...' : 'Example: invalid bank details, duplicate request, compliance hold...',
        });
        if (!reason) return;

        try {
            const { error } = await supabase.rpc('admin_review_withdrawal', {
                p_withdrawal_id: withdrawal.id,
                p_decision: decision,
                p_reason: reason,
            });
            if (error) throw error;
            addToast(isApprove ? 'Payout approved' : 'Payout rejected and refunded', 'success');
            setPayoutCase(prev => prev?.id === withdrawal.id ? null : prev);
            loadFinance();
            loadOpsSnapshot();
            if (activeTab === 'audit') loadAuditLogs(0);
        } catch (err) {
            addToast(`Payout review failed: ${err.message}`, 'error');
        }
    };

    const saveBanner = async () => {
        if (!requireAdminPermission(adminPermissionFlags.writeConfig, 'config write')) return;
        const active = bannerText.trim().length > 0;
        const reason = await requestAdminReason({
            title: active ? 'Publish announcement banner' : 'Clear announcement banner',
            description: active ? bannerText.trim().slice(0, 180) : 'Clear the current announcement banner.',
            impact: 'This changes the banner shown across the app.',
            confirmLabel: active ? 'Publish banner' : 'Clear banner',
            placeholder: 'Example: scheduled campus update, incident notice, stale banner cleanup...',
        });
        if (!reason) return;

        await handleConfigToggle('banner_message', bannerText, reason);
        await handleConfigToggle('banner_active', active, reason);
    };

    const saveSwipeLimit = async () => {
        if (!requireAdminPermission(adminPermissionFlags.writeConfig, 'config write')) return;
        const reason = await requestAdminReason({
            title: 'Update free daily swipes',
            description: `Set the free daily swipe limit to ${Number(swipeLimit)}.`,
            impact: 'This changes the free user swipe economy across the app.',
            confirmLabel: 'Save swipe limit',
            placeholder: 'Example: pricing test, abuse reduction, campaign adjustment...',
        });
        if (!reason) return;

        await handleConfigToggle('free_daily_swipes', Number(swipeLimit), reason);
    };

    const getPushDraftSignature = () => JSON.stringify({
        segment: pushSegment,
        title: pushTitle.trim(),
        body: pushBody.trim(),
        url: pushUrl.trim() || '/notifications',
    });

    const runPushBroadcastAction = async (action, reason = '') => {
        if ((action === 'test' || action === 'broadcast') && (!pushTitle.trim() || !pushBody.trim())) {
            addToast('Title and message are required', 'error');
            return null;
        }

        const draftSignature = getPushDraftSignature();
        setIsPushing(true);
        try {
            const { data, error } = await supabase.functions.invoke('admin-push-broadcast', {
                body: {
                    action,
                    segment: pushSegment,
                    title: pushTitle.trim(),
                    body: pushBody.trim(),
                    reason,
                    url: pushUrl.trim() || '/notifications',
                },
            });
            if (error) throw error;
            if (!data?.success) throw new Error(data?.message || 'Push broadcast request failed');

            if (action === 'preview') {
                setPushPreview({ ...data, draftSignature });
                addToast(`Preview ready: ${fmt(data.userCount)} users, ${fmt(data.deviceCount)} devices`, 'success');
            } else if (action === 'test') {
                setPushPreview({ ...data, draftSignature });
                addToast(data.skipped ? 'No eligible admin device for test push' : 'Test push sent to your devices', data.skipped ? 'info' : 'success');
                loadPushHistory();
            } else {
                setPushPreview({ ...data, draftSignature });
                setPushTitle('');
                setPushBody('');
                setPushUrl('/notifications');
                addToast(data.skipped ? 'Broadcast skipped: no eligible targets' : `Broadcast sent to ${fmt(data.deviceCount)} devices`, data.skipped ? 'info' : 'success');
                loadOpsSnapshot();
                loadPushHistory();
                if (activeTab === 'audit') loadAuditLogs(0);
            }
            return data;
        } catch (err) {
            addToast(`Push broadcast failed: ${err.message}`, 'error');
            return null;
        } finally {
            setIsPushing(false);
        }
    };

    const previewPushBroadcast = () => runPushBroadcastAction('preview');

    const testPushBroadcast = async () => {
        const reason = await requestAdminReason({
            title: 'Send test push',
            description: 'Send this notification only to your eligible admin device subscriptions.',
            impact: 'No users will receive this test. The attempt is recorded for auditability.',
            confirmLabel: 'Send test',
            placeholder: 'Example: validating campaign copy and notification routing before broadcast...',
        });
        if (!reason) return;
        await runPushBroadcastAction('test', reason);
    };

    const sendPushBroadcast = async () => {
        if (!pushPreview || pushPreview.draftSignature !== getPushDraftSignature()) {
            addToast('Preview the current push draft before broadcasting', 'error');
            return;
        }
        if (Number(pushPreview.deviceCount || 0) <= 0) {
            addToast('Current preview has no eligible devices to broadcast to', 'error');
            return;
        }
        const reason = await requestAdminReason({
            title: 'Send push broadcast',
            description: `Send "${pushTitle.trim() || 'this notification'}" to the selected eligible segment.`,
            impact: 'This can notify many users. It respects push and marketing preferences, excludes banned/shadow-banned users, and creates in-app notification records.',
            confirmLabel: 'Send broadcast',
            variant: 'danger',
            placeholder: 'Example: approved campus campaign, safety announcement, release update...',
        });
        if (!reason) return;
        await runPushBroadcastAction('broadcast', reason);
    };

    const toggleAdminPermission = (permission) => {
        setAdminAccessPermissions(prev => (
            prev.includes(permission)
                ? prev.filter(item => item !== permission)
                : [...prev, permission]
        ));
    };

    const editAdminAccess = (admin) => {
        if (!adminPermissionFlags.manageAdminAccess) return;
        const permissions = Array.isArray(admin.permissions) ? admin.permissions.filter(Boolean) : [];
        setAdminAccessTargetId(admin.user_id);
        setAdminAccessMode(admin.permission_mode === 'explicit_permissions' ? 'restricted_admin' : 'legacy_admin');
        setAdminAccessPermissions(permissions.length > 0 ? permissions : ['users:read', 'audit:read']);
        addToast('Admin access editor loaded', 'success');
    };

    const startAdminRevoke = (admin) => {
        if (!adminPermissionFlags.manageAdminAccess) return;
        setAdminAccessTargetId(admin.user_id);
        setAdminAccessMode('revoke_admin');
        addToast('Revoke mode loaded for selected admin', 'success');
    };

    const updateAdminAccess = async () => {
        const targetId = adminAccessTargetId.trim();
        if (!targetId) return addToast('Enter a target user ID', 'error');
        if (adminAccessMode === 'restricted_admin' && adminAccessPermissions.length === 0) {
            return addToast('Restricted admins need at least one permission', 'error');
        }

        const modeLabel = adminAccessMode === 'legacy_admin'
            ? 'Grant full legacy admin'
            : adminAccessMode === 'restricted_admin'
                ? 'Set restricted admin'
                : 'Revoke admin access';
        const reason = await requestAdminReason({
            title: modeLabel,
            description: `Target user ID: ${targetId}`,
            impact: 'This changes who can access admin functionality. Owners cannot be revoked through this tool.',
            confirmLabel: modeLabel,
            variant: adminAccessMode === 'revoke_admin' ? 'danger' : 'default',
            placeholder: 'Example: role assignment approved by owner, contractor access expired, finance-only access...',
        });
        if (!reason) return;

        setSavingAdminAccess(true);
        try {
            const { error } = await supabase.rpc('admin_update_admin_access', {
                p_target_user_id: targetId,
                p_mode: adminAccessMode,
                p_permissions: adminAccessMode === 'restricted_admin' ? adminAccessPermissions : [],
                p_reason: reason,
            });
            if (error) throw error;
            addToast('Admin access updated', 'success');
            setAdminAccessTargetId('');
            await loadAdminAccessList();
            if (activeTab === 'audit') loadAuditLogs(0);
        } catch (err) {
            addToast(`Admin access update failed: ${err.message}`, 'error');
        } finally {
            setSavingAdminAccess(false);
        }
    };

    const toggleFeatureFlag = async (key, label, newValue) => {
        if (!requireAdminPermission(adminPermissionFlags.writeConfig, 'config write')) return;
        const reason = await requestAdminReason({
            title: `${newValue ? 'Enable' : 'Disable'} ${label}`,
            description: `${label} will be ${newValue ? 'enabled' : 'disabled'} for users.`,
            impact: 'Feature flags can immediately affect live app behavior.',
            confirmLabel: newValue ? 'Enable feature' : 'Disable feature',
            variant: newValue ? 'default' : 'danger',
            placeholder: 'Example: rollout decision, incident response, maintenance window...',
        });
        if (!reason) return;

        await handleConfigToggle(key, newValue, reason);
    };

    const removeBanner = async () => {
        if (!requireAdminPermission(adminPermissionFlags.writeConfig, 'config write')) return;
        const reason = await requestAdminReason({
            title: 'Remove announcement banner',
            description: 'Disable and clear the active announcement banner.',
            impact: 'The banner will disappear for all users.',
            confirmLabel: 'Remove banner',
            variant: 'danger',
            placeholder: 'Example: campaign ended, announcement expired, incorrect message...',
        });
        if (!reason) return;

        setBannerText('');
        await handleConfigToggle('banner_active', false, reason);
        await handleConfigToggle('banner_message', '', reason);
    };

    const filteredTransactions = transactions;

    const visibleLedgerTotals = filteredTransactions.reduce((acc, txn) => {
        const amount = Number(txn.amount || 0);
        acc.count += 1;
        acc.total += amount;
        if (String(txn.type).toLowerCase() === 'credit') acc.credit += amount;
        if (String(txn.type).toLowerCase() === 'debit') acc.debit += amount;
        return acc;
    }, { count: 0, total: 0, credit: 0, debit: 0 });
    const ledgerTotals = txnServerTotals || visibleLedgerTotals;
    const activeFinanceSubTab = adminPermissionFlags.readFinance ? financeSubTab : 'promo';
    const analyticsSummary = analytics ? (() => {
        const asRows = (rows) => (Array.isArray(rows) ? rows : []);
        const sumRows = (rows, key = 'total') => asRows(rows).reduce((sum, row) => sum + Number(row?.[key] || 0), 0);
        const signupTotal = sumRows(analytics.dailySignups, 'count');
        const verifiedCashTotal = sumRows(analytics.dailyRevenue, 'total');
        const appSpendTotal = sumRows(analytics.dailyAppSpend, 'total');
        const transactionCount = sumRows(analytics.revenueBreakdown, 'count');
        const topCampus = [...asRows(analytics.universityStats)]
            .sort((a, b) => Number(b.user_count || 0) - Number(a.user_count || 0))[0];
        const topSpender = asRows(analytics.topSpenders)[0];
        const maleCount = Number(analytics.genderSplit?.male || 0);
        const femaleCount = Number(analytics.genderSplit?.female || 0);
        const genderTotal = Math.max(maleCount + femaleCount, 1);
        const malePct = Math.round((maleCount / genderTotal) * 100);
        const femalePct = Math.round((femaleCount / genderTotal) * 100);

        return {
            signupTotal,
            verifiedCashTotal,
            appSpendTotal,
            transactionCount,
            topCampus,
            topSpender,
            malePct,
            femalePct,
            loadedAt: workspaceLoadedAt.analytics,
        };
    })() : null;

    const applyTxnFilters = () => loadTransactions(0);

    const resetTxnFilters = () => {
        const clearedFilters = {
            search: '',
            university: '',
            gender: '',
            type: '',
            status: '',
            source: '',
            from: '',
            to: '',
        };
        setTxnFilter(clearedFilters);
        loadTransactions(0, clearedFilters);
    };

    const exportFilteredTransactions = () => {
        if (filteredTransactions.length === 0) return addToast('No transactions to export', 'error');
        const headers = ['Date', 'User', 'University', 'Gender', 'Type', 'Source', 'Amount', 'Status', 'Reference', 'Description'];
        const rows = filteredTransactions.map(t => [
            t.created_at ? new Date(t.created_at).toISOString() : '',
            t.full_name || '',
            t.university || '',
            t.gender || '',
            t.type || '',
            t.payment_method || 'wallet',
            t.amount || 0,
            t.status || '',
            t.reference_id || '',
            t.description || '',
        ]);
        const csv = [headers, ...rows]
            .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `college-date-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        addToast(`Exported ${filteredTransactions.length} transactions`, 'success');
    };

    const exportVisiblePayouts = () => {
        if (filteredWithdrawals.length === 0) return addToast('No payouts to export', 'error');
        const headers = ['Requested At', 'Requester', 'Email', 'User ID', 'University', 'Gender', 'Amount', 'Status', 'Bank Details', 'Withdrawal ID', 'Processed At'];
        const rows = filteredWithdrawals.map(withdrawal => [
            withdrawal.created_at || '',
            withdrawal.full_name || '',
            withdrawal.email || '',
            withdrawal.user_id || '',
            withdrawal.university || '',
            withdrawal.gender || '',
            withdrawal.amount || 0,
            withdrawal.status || '',
            bankDetailsSummary(withdrawal.bank_details),
            withdrawal.id || '',
            withdrawal.processed_at || '',
        ]);
        const csv = [headers, ...rows]
            .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `college-date-payouts-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        addToast(`Exported ${filteredWithdrawals.length} payout requests`, 'success');
    };

    const exportVisiblePromoCodes = () => {
        if (filteredPromoCodes.length === 0) return addToast('No promo codes to export', 'error');
        const headers = ['Code', 'Discount Percent', 'Uses', 'Max Uses', 'Remaining Uses', 'Status', 'Created At', 'Promo ID'];
        const rows = filteredPromoCodes.map(promo => {
            const maxUses = Number(promo.max_uses || 0);
            const uses = Number(promo.uses_count || 0);
            return [
                promo.code || '',
                promo.discount_percent || 0,
                uses,
                maxUses,
                Math.max(maxUses - uses, 0),
                promo.is_active ? 'active' : 'inactive',
                promo.created_at || '',
                promo.id || '',
            ];
        });
        const csv = [headers, ...rows]
            .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `college-date-promo-codes-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        addToast(`Exported ${filteredPromoCodes.length} promo codes`, 'success');
    };

    const exportWalletBalances = () => {
        if (wallets.length === 0) return addToast('No wallet balances to export', 'error');
        const headers = ['Name', 'Email', 'User ID', 'University', 'Gender', 'Balance', 'Available', 'Pending', 'Earned', 'Spent'];
        const rows = wallets.map(wallet => [
            wallet.full_name || '',
            wallet.email || '',
            wallet.user_id || '',
            wallet.university || '',
            wallet.gender || '',
            wallet.balance || 0,
            wallet.available_balance || 0,
            wallet.pending_balance || 0,
            wallet.total_earned || 0,
            wallet.total_spent || 0,
        ]);
        const csv = [headers, ...rows]
            .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `college-date-wallet-balances-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        addToast(`Exported ${wallets.length} wallet balance rows`, 'success');
    };

    const userSummary = usersList.reduce((acc, user) => {
        const attention = userAttentionProfile(user);
        acc.total += 1;
        if (user.is_banned) acc.banned += 1;
        else if (user.is_shadow_banned) acc.shadow += 1;
        else acc.active += 1;
        if (user.is_verified) acc.verified += 1;
        if (user.is_premium) acc.premium += 1;
        if (attention.score >= 3) acc.needsReview += 1;
        return acc;
    }, { total: 0, active: 0, banned: 0, shadow: 0, verified: 0, premium: 0, needsReview: 0 });
    const selectedUsersList = usersList.filter(user => selectedUsers.has(user.id));
    const selectedUserSummary = selectedUsersList.reduce((acc, user) => {
        const attention = userAttentionProfile(user);
        acc.total += 1;
        if (user.is_banned) acc.banned += 1;
        else if (user.is_shadow_banned) acc.shadow += 1;
        else acc.active += 1;
        if (user.is_verified) acc.verified += 1;
        if (user.is_premium) acc.premium += 1;
        if (attention.score >= 3) acc.needsReview += 1;
        return acc;
    }, { total: 0, active: 0, banned: 0, shadow: 0, verified: 0, premium: 0, needsReview: 0 });

    const applyUserFilters = () => searchUsers(0);

    const applyUserSummaryFilter = (patch) => {
        const nextFilters = { ...userFilters, ...patch };
        setUserFilters(nextFilters);
        searchUsers(0, searchQuery, nextFilters);
    };

    const resetUserFilters = () => {
        const clearedFilters = {
            status: '',
            gender: '',
            university: '',
            verified: '',
            premium: '',
        };
        setSearchQuery('');
        setUserFilters(clearedFilters);
        searchUsers(0, '', clearedFilters);
    };

    const exportFilteredUsers = () => {
        if (usersList.length === 0) return addToast('No users to export', 'error');
        const headers = ['Name', 'Email', 'Gender', 'University', 'Status', 'Attention', 'Attention Reasons', 'Verified', 'Premium', 'Joined', 'Last Seen'];
        const rows = usersList.map(user => {
            const attention = userAttentionProfile(user);
            return [
                user.full_name || '',
                user.email || '',
                user.gender || '',
                user.university || '',
                user.is_banned ? 'banned' : user.is_shadow_banned ? 'shadow' : 'active',
                attention.label,
                attention.reasons.join(' / '),
                user.is_verified ? 'yes' : 'no',
                user.is_premium ? 'yes' : 'no',
                user.created_at || '',
                user.last_seen_at || user.last_active || '',
            ];
        });
        const csv = [headers, ...rows]
            .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `college-date-users-page-${userPage + 1}-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        addToast(`Exported ${usersList.length} visible users`, 'success');
    };

    const getSelectedUserRows = () => selectedUsersList.map(user => {
        const attention = userAttentionProfile(user);
        return {
            id: user.id || '',
            name: user.full_name || '',
            email: user.email || '',
            gender: user.gender || '',
            university: user.university || '',
            status: user.is_banned ? 'banned' : user.is_shadow_banned ? 'shadow' : 'active',
            attention: attention.label,
            attentionReasons: attention.reasons.join(' / '),
            verified: user.is_verified ? 'yes' : 'no',
            premium: user.is_premium ? 'yes' : 'no',
            joined: user.created_at || '',
            lastSeen: user.last_seen_at || user.last_active || '',
        };
    });

    const copySelectedUsersSummary = () => {
        if (selectedUsersList.length === 0) return addToast('No selected users to copy', 'error');
        const summary = {
            generatedAt: new Date().toISOString(),
            generatedBy: currentUser?.email || currentUser?.id || 'admin',
            counts: selectedUserSummary,
            users: getSelectedUserRows(),
        };
        copyToClipboard(JSON.stringify(summary, null, 2), 'Selected users');
    };

    const exportSelectedUsers = () => {
        if (selectedUsersList.length === 0) return addToast('No selected users to export', 'error');
        const headers = ['User ID', 'Name', 'Email', 'Gender', 'University', 'Status', 'Attention', 'Attention Reasons', 'Verified', 'Premium', 'Joined', 'Last Seen'];
        const rows = getSelectedUserRows().map(user => [
            user.id,
            user.name,
            user.email,
            user.gender,
            user.university,
            user.status,
            user.attention,
            user.attentionReasons,
            user.verified,
            user.premium,
            user.joined,
            user.lastSeen,
        ]);
        const csv = [headers, ...rows]
            .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `college-date-selected-users-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        addToast(`Exported ${selectedUsersList.length} selected users`, 'success');
    };

    const exportVisibleModerationQueue = () => {
        const isReports = contentSubTab === 'reports';
        const sourceRows = isReports ? reports : confessions;
        if (sourceRows.length === 0) return addToast(`No ${isReports ? 'reports' : 'confessions'} to export`, 'error');

        const headers = isReports
            ? ['Reported At', 'Report ID', 'Confession ID', 'Reason', 'Status', 'Reporter ID', 'Content', 'University', 'Post Created At']
            : ['Created At', 'Confession ID', 'University', 'Content'];
        const rows = isReports
            ? reports.map(report => [
                report.created_at || '',
                report.id || '',
                report.confession_id || '',
                report.reason || '',
                report.status || '',
                report.reporter_id || '',
                report.confessions?.content || report.confession_content || '',
                report.confessions?.university || report.confession_university || '',
                report.confessions?.created_at || report.confession_created_at || '',
            ])
            : confessions.map(confession => [
                confession.created_at || '',
                confession.id || '',
                confession.university || '',
                confession.content || '',
            ]);
        const csv = [headers, ...rows]
            .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `college-date-${isReports ? 'reports' : 'confessions'}-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        addToast(`Exported ${sourceRows.length} visible ${isReports ? 'reports' : 'confessions'}`, 'success');
    };

    const getVisibleModerationRows = () => {
        if (contentSubTab === 'reports') {
            return reports.map(report => ({
                type: 'report',
                createdAt: report.created_at || '',
                reportId: report.id || '',
                confessionId: report.confession_id || '',
                reason: report.reason || '',
                status: report.status || '',
                reporterId: report.reporter_id || '',
                content: report.confessions?.content || report.confession_content || '',
                university: report.confessions?.university || report.confession_university || '',
                postCreatedAt: report.confessions?.created_at || report.confession_created_at || '',
            }));
        }
        return confessions.map(confession => ({
            type: 'confession',
            createdAt: confession.created_at || '',
            confessionId: confession.id || '',
            university: confession.university || '',
            content: confession.content || '',
        }));
    };

    const copyVisibleModerationQueueSummary = () => {
        const rows = getVisibleModerationRows();
        if (rows.length === 0) return addToast(`No ${contentSubTab === 'reports' ? 'reports' : 'confessions'} to copy`, 'error');
        const summary = {
            generatedAt: new Date().toISOString(),
            generatedBy: currentUser?.email || currentUser?.id || 'admin',
            queue: contentSubTab,
            page: contentSubTab === 'reports' ? reportPage + 1 : confessionPage + 1,
            totalMatches: contentSubTab === 'reports' ? reportTotal || reports.length : confessionTotal || confessions.length,
            filters: contentFilters,
            rows,
        };
        copyToClipboard(JSON.stringify(summary, null, 2), 'Moderation queue');
    };

    const getKeywordRows = (sourceKeywords = keywords) => sourceKeywords.map(keyword => ({
        keyword,
        length: keyword.length,
        wordCount: keyword.split(/\s+/).filter(Boolean).length,
    }));

    const copyKeywordSummary = () => {
        if (keywords.length === 0) return addToast('No keywords to copy', 'error');
        const summary = {
            generatedAt: new Date().toISOString(),
            generatedBy: currentUser?.email || currentUser?.id || 'admin',
            totalKeywords: keywords.length,
            visibleKeywords: filteredKeywords.length,
            search: keywordSearch,
            keywords: getKeywordRows(filteredKeywords),
        };
        copyToClipboard(JSON.stringify(summary, null, 2), 'Keyword rules');
    };

    const exportKeywordRules = () => {
        if (filteredKeywords.length === 0) return addToast('No keyword rules to export', 'error');
        const headers = ['Keyword', 'Characters', 'Words'];
        const rows = getKeywordRows(filteredKeywords).map(row => [row.keyword, row.length, row.wordCount]);
        const csv = [headers, ...rows]
            .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `college-date-keyword-rules-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        addToast(`Exported ${filteredKeywords.length} keyword rules`, 'success');
    };

    const getVisibleAuditRows = () => auditLogs.map(log => ({
        createdAt: log.created_at ? new Date(log.created_at).toISOString() : '',
        adminName: log.admin_name || '',
        adminEmail: log.admin_email || '',
        adminId: log.admin_user_id || '',
        action: log.action || '',
        targetType: log.target_type || 'system',
        targetId: log.target_id || '',
        metadata: log.metadata || {},
    }));

    const copyVisibleAuditLogsSummary = () => {
        if (auditLogs.length === 0) return addToast('No audit logs to copy', 'error');
        const summary = {
            generatedAt: new Date().toISOString(),
            generatedBy: currentUser?.email || currentUser?.id || 'admin',
            page: auditPage + 1,
            totalMatches: auditTotal || auditLogs.length,
            filters: auditFilters,
            logs: getVisibleAuditRows(),
        };
        copyToClipboard(JSON.stringify(summary, null, 2), 'Audit logs');
    };

    const exportVisibleAuditLogs = () => {
        if (auditLogs.length === 0) return addToast('No audit logs to export', 'error');
        const headers = ['Created At', 'Admin Name', 'Admin Email', 'Admin ID', 'Action', 'Target Type', 'Target ID', 'Metadata JSON'];
        const rows = getVisibleAuditRows().map(log => [
            log.createdAt,
            log.adminName,
            log.adminEmail,
            log.adminId,
            log.action,
            log.targetType,
            log.targetId,
            auditMetadataJson(log.metadata),
        ]);
        const csv = [headers, ...rows]
            .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `college-date-audit-page-${auditPage + 1}-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        addToast(`Exported ${auditLogs.length} visible audit logs`, 'success');
    };

    const exportAnalyticsReport = () => {
        if (!analytics) return addToast('No analytics loaded to export', 'error');
        const sections = [];
        const addSection = (title, headers, rows) => {
            sections.push([title]);
            sections.push(headers);
            rows.forEach(row => sections.push(row));
            sections.push([]);
        };

        addSection(
            'Daily signups',
            ['Date', 'Count'],
            (analytics.dailySignups || []).map(row => [row.date || '', row.count || 0])
        );
        addSection(
            'Verified cash',
            ['Date', 'Total'],
            (analytics.dailyRevenue || []).map(row => [row.date || '', row.total || 0])
        );
        addSection(
            'App spend',
            ['Date', 'Total'],
            (analytics.dailyAppSpend || []).map(row => [row.date || '', row.total || 0])
        );
        addSection(
            'Top spenders',
            ['Rank', 'Name', 'University', 'Total spent'],
            (analytics.topSpenders || []).map((row, index) => [index + 1, row.full_name || '', row.university || '', row.total_spent || 0])
        );
        addSection(
            'Revenue breakdown',
            ['Source', 'Type', 'Status', 'Count', 'Total'],
            (analytics.revenueBreakdown || []).map(row => [row.payment_method || '', row.type || '', row.status || '', row.count || 0, row.total || 0])
        );
        addSection(
            'University breakdown',
            ['University', 'Users', 'Males', 'Females'],
            (analytics.universityStats || []).map(row => [row.university || '', row.user_count || 0, row.males || 0, row.females || 0])
        );
        addSection(
            'Gender split',
            ['Gender', 'Count'],
            [
                ['Male', analytics.genderSplit?.male || 0],
                ['Female', analytics.genderSplit?.female || 0],
            ]
        );

        const csv = sections
            .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `college-date-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        addToast('Exported analytics report', 'success');
    };

    const pendingReportsCount = Number(opsSnapshot?.pendingReports ?? pendingReportTotal ?? 0);
    const visibleContentRows = contentSubTab === 'reports' ? reports : confessions;
    const visibleContentSummary = visibleContentRows.reduce((acc, item) => {
        acc.visible += 1;
        const university = contentSubTab === 'reports'
            ? item.confessions?.university || item.confession_university
            : item.university;
        if (university) acc.universities.add(university);
        if (contentSubTab === 'reports' && item.status === 'pending') acc.pending += 1;
        if (item.created_at) {
            const ts = new Date(item.created_at).getTime();
            if (!Number.isNaN(ts)) acc.newest = Math.max(acc.newest || 0, ts);
        }
        return acc;
    }, { visible: 0, pending: 0, universities: new Set(), newest: 0 });
    const filteredKeywords = keywords
        .filter(keyword => keyword.toLowerCase().includes(keywordSearch.trim().toLowerCase()))
        .sort((a, b) => a.localeCompare(b));
    const keywordSummary = getKeywordRows(keywords).reduce((acc, row) => {
        acc.total += 1;
        if (row.wordCount > 1) acc.phrases += 1;
        else acc.singleWords += 1;
        acc.longest = Math.max(acc.longest, row.length);
        return acc;
    }, { total: 0, phrases: 0, singleWords: 0, longest: 0 });
    const filteredPromoCodes = promoCodes.filter(promo => {
        const search = promoFilters.search.trim().toLowerCase();
        if (search) {
            const haystack = [
                promo.code,
                promo.id,
                promo.created_by,
                promo.discount_percent,
                promo.max_uses,
            ].filter(value => value !== undefined && value !== null).join(' ').toLowerCase();
            if (!haystack.includes(search)) return false;
        }
        if (promoFilters.status === 'active' && !promo.is_active) return false;
        if (promoFilters.status === 'inactive' && promo.is_active) return false;
        if (promoFilters.status === 'exhausted' && Number(promo.uses_count || 0) < Number(promo.max_uses || 0)) return false;
        return true;
    });
    const promoSummary = promoCodes.reduce((acc, promo) => {
        acc.total += 1;
        if (promo.is_active) acc.active += 1;
        else acc.inactive += 1;
        if (Number(promo.uses_count || 0) >= Number(promo.max_uses || 0)) acc.exhausted += 1;
        acc.uses += Number(promo.uses_count || 0);
        acc.capacity += Number(promo.max_uses || 0);
        return acc;
    }, { total: 0, active: 0, inactive: 0, exhausted: 0, uses: 0, capacity: 0 });
    const filteredWithdrawals = withdrawals.filter(withdrawal => {
        const search = payoutFilters.search.trim().toLowerCase();
        if (search) {
            const haystack = [
                withdrawal.full_name,
                withdrawal.email,
                withdrawal.user_id,
                withdrawal.university,
                withdrawal.id,
                bankDetailsSummary(withdrawal.bank_details),
            ].filter(Boolean).join(' ').toLowerCase();
            if (!haystack.includes(search)) return false;
        }
        if (payoutFilters.from || payoutFilters.to) {
            const created = withdrawal.created_at ? new Date(withdrawal.created_at).getTime() : 0;
            const from = payoutFilters.from ? new Date(`${payoutFilters.from}T00:00:00`).getTime() : null;
            const to = payoutFilters.to ? new Date(`${payoutFilters.to}T23:59:59.999`).getTime() : null;
            if (from && created < from) return false;
            if (to && created > to) return false;
        }
        return true;
    });
    const payoutVisiblePending = filteredWithdrawals.filter(w => w.status === 'pending');
    const payoutVisibleApproved = filteredWithdrawals.filter(w => w.status === 'approved');
    const payoutVisibleRejected = filteredWithdrawals.filter(w => w.status === 'rejected');
    const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');
    const pendingWithdrawalsCount = Number(opsSnapshot?.pendingWithdrawals ?? pendingWithdrawals.length ?? 0);
    const pendingWithdrawalsAmount = Number(
        opsSnapshot?.pendingWithdrawalAmount
        ?? pendingWithdrawals.reduce((sum, w) => sum + Number(w.amount || 0), 0)
        ?? 0
    );
    const pendingPaymentAmount = Number(opsSnapshot?.pendingPayments ?? stats?.pendingPayments ?? 0);
    const auditCount = Number(opsSnapshot?.auditRecords ?? auditTotal ?? auditLogs.length ?? 0);
    const visibleAuditSummary = auditLogs.reduce((acc, log) => {
        acc.visible += 1;
        if (log.admin_user_id || log.admin_email) acc.admins.add(log.admin_user_id || log.admin_email);
        if (log.action) acc.actions.add(log.action);
        acc.targets.add(log.target_type || 'system');
        if (log.created_at) {
            const ts = new Date(log.created_at).getTime();
            if (!Number.isNaN(ts)) acc.newest = Math.max(acc.newest || 0, ts);
        }
        return acc;
    }, { visible: 0, admins: new Set(), actions: new Set(), targets: new Set(), newest: 0 });
    const opsSnapshotUpdatedAt = opsSnapshot?.generatedAt
        ? new Date(opsSnapshot.generatedAt).toLocaleString()
        : null;
    const adminTabs = [
        ['overview', 'OV', 'Overview', true],
        ['analytics', 'AN', 'Analytics', adminPermissionFlags.readFinance],
        ['users', 'US', 'Users', adminPermissionFlags.readUsers],
        ['content', 'CT', 'Content', adminPermissionFlags.moderateContent],
        ['finance', 'FI', 'Finance', adminPermissionFlags.readFinance || adminPermissionFlags.writePromo],
        ['controls', 'CO', 'Controls', adminPermissionFlags.writeConfig || adminPermissionFlags.broadcastPush || adminPermissionFlags.manageAdminAccess],
        ['audit', 'Audit', 'Audit', adminPermissionFlags.readAudit],
    ];
    const visibleAdminTabs = adminTabs.filter(([, , , allowed]) => allowed);
    const navBadges = {
        content: pendingReportsCount,
        finance: pendingWithdrawalsCount,
        controls: pushTitle.trim() || pushBody.trim() ? 1 : 0,
        audit: auditCount,
    };
    const workspaceLabels = {
        overview: 'Overview',
        analytics: 'Analytics',
        users: 'Users',
        content: 'Content',
        finance: 'Finance',
        controls: 'Controls',
        audit: 'Audit',
    };
    const activeWorkspaceLoadedAt = workspaceLoadedAt[activeTab];
    const isRefreshingWorkspace =
        (activeTab === 'overview' && loadingStats) ||
        (activeTab === 'analytics' && loadingAnalytics) ||
        (activeTab === 'users' && loadingUsers) ||
        (activeTab === 'content' && loadingConfessions) ||
        (activeTab === 'finance' && (loadingFinance || loadingTransactions)) ||
        (activeTab === 'controls' && loadingConfig) ||
        (activeTab === 'audit' && loadingAudit);
    const pushDraftSignature = getPushDraftSignature();
    const isPushDraftComplete = Boolean(pushTitle.trim() && pushBody.trim());
    const isPushPreviewCurrent = Boolean(pushPreview && pushPreview.draftSignature === pushDraftSignature);
    const pushReadinessItems = [
        { label: 'Title added', done: Boolean(pushTitle.trim()), detail: `${pushTitle.trim().length}/80 suggested characters` },
        { label: 'Message added', done: Boolean(pushBody.trim()), detail: `${pushBody.trim().length}/180 suggested characters` },
        { label: 'Audience selected', done: Boolean(pushSegment), detail: pushSegmentLabels[pushSegment] || pushSegment },
        { label: 'Fresh preview', done: isPushPreviewCurrent, detail: isPushPreviewCurrent ? `${fmt(pushPreview.deviceCount)} eligible device${Number(pushPreview.deviceCount || 0) === 1 ? '' : 's'}` : 'Preview required after edits' },
        { label: 'Targets available', done: isPushPreviewCurrent && Number(pushPreview?.deviceCount || 0) > 0, detail: isPushPreviewCurrent ? `${fmt(pushPreview?.userCount)} user${Number(pushPreview?.userCount || 0) === 1 ? '' : 's'}` : 'Unknown until preview' },
    ];
    const configFlagRows = [
        ['leaderboard_enabled', 'Leaderboard', 'Show/hide the Hall of Fame'],
        ['confessions_enabled', 'Campus Secrets', 'Enable or disable confessions'],
        ['premium_swipes_enabled', 'Premium Swipes', 'Allow paid swipe purchases'],
        ['maintenance_mode', 'Maintenance Mode', 'Lock the app for all non-admins'],
    ];
    const isConfigOn = (key) => appConfig[key] === true || appConfig[key] === 'true';
    const fullAdminCount = adminAccessList.filter(admin => admin.permission_mode !== 'explicit_permissions').length;
    const restrictedAdminCount = adminAccessList.filter(admin => admin.permission_mode === 'explicit_permissions').length;

    const refreshCurrentWorkspace = () => {
        if (activeTab === 'overview') loadStats();
        else if (activeTab === 'analytics') loadAnalytics();
        else if (activeTab === 'users') searchUsers(userPage);
        else if (activeTab === 'content') loadConfessions();
        else if (activeTab === 'finance') loadFinance();
        else if (activeTab === 'controls') loadConfig();
        else if (activeTab === 'audit') loadAuditLogs(auditPage);
    };

    useEffect(() => {
        if (visibleAdminTabs.length === 0) return;
        if (!visibleAdminTabs.some(([tab]) => tab === activeTab)) {
            setActiveTab(visibleAdminTabs[0][0]);
        }
    }, [activeTab, visibleAdminTabs]);

    useEffect(() => {
        writeAdminPrefs({
            activeTab,
            contentSubTab,
            financeSubTab,
            searchQuery,
            userFilters,
            contentFilters,
            payoutFilters,
            promoFilters,
            txnFilter,
            auditFilters,
            keywordSearch,
            densityMode,
        });
    }, [activeTab, contentSubTab, financeSubTab, searchQuery, userFilters, contentFilters, payoutFilters, promoFilters, txnFilter, auditFilters, keywordSearch, densityMode]);

    const opsQueue = [
        {
            key: 'reports',
            label: 'Pending reports',
            value: pendingReportsCount,
            detail: 'Confession reports awaiting moderator review',
            tab: 'content',
            subTab: () => setContentSubTab('reports'),
            tone: pendingReportsCount > 0 ? 'danger' : 'ok',
        },
        {
            key: 'payouts',
            label: 'Pending payouts',
            value: fmtCurrency(pendingWithdrawalsAmount),
            detail: `${fmt(pendingWithdrawalsCount)} withdrawal requests need approve/reject review`,
            tab: 'finance',
            subTab: () => setFinanceSubTab('payouts'),
            tone: pendingWithdrawalsCount > 0 ? 'warning' : 'ok',
        },
        {
            key: 'payments',
            label: 'Pending payments',
            value: fmtCurrency(pendingPaymentAmount),
            detail: 'Unverified payment rows to investigate before counting as cash',
            tab: 'analytics',
            tone: pendingPaymentAmount > 0 ? 'warning' : 'ok',
        },
        {
            key: 'audit',
            label: 'Audit records visible',
            value: fmt(auditCount),
            detail: 'Recent sensitive admin actions with reason trails',
            tab: 'audit',
            tone: auditCount > 0 ? 'info' : 'ok',
        },
    ];
    const triageItems = [
        adminPermissionFlags.moderateContent && pendingReportsCount > 0 && {
            key: 'triage-reports',
            severity: 'critical',
            label: `${fmt(pendingReportsCount)} content report${pendingReportsCount === 1 ? '' : 's'} need review`,
            detail: 'Moderation should clear these before lower-risk admin work.',
            action: 'Open reports',
            tab: 'content',
            subTab: () => setContentSubTab('reports'),
        },
        adminPermissionFlags.reviewPayouts && pendingWithdrawalsCount > 0 && {
            key: 'triage-payouts',
            severity: pendingWithdrawalsAmount >= 50000 ? 'critical' : 'warning',
            label: `${fmtCurrency(pendingWithdrawalsAmount)} pending payout liability`,
            detail: `${fmt(pendingWithdrawalsCount)} request${pendingWithdrawalsCount === 1 ? '' : 's'} awaiting approve/reject decision.`,
            action: 'Open payouts',
            tab: 'finance',
            subTab: () => setFinanceSubTab('payouts'),
        },
        adminPermissionFlags.readFinance && pendingPaymentAmount > 0 && {
            key: 'triage-payments',
            severity: 'warning',
            label: `${fmtCurrency(pendingPaymentAmount)} pending payments`,
            detail: 'Do not count these as verified cash until payment rows are confirmed.',
            action: 'Open analytics',
            tab: 'analytics',
        },
        adminPermissionFlags.broadcastPush && (pushTitle.trim() || pushBody.trim()) && {
            key: 'triage-push-draft',
            severity: 'info',
            label: 'Push broadcast draft in progress',
            detail: 'Preview and test-send before broadcasting to students.',
            action: 'Open push',
            tab: 'controls',
        },
        adminPermissionFlags.readAudit && auditCount > 0 && {
            key: 'triage-audit',
            severity: 'info',
            label: `${fmt(auditCount)} audit record${auditCount === 1 ? '' : 's'} visible`,
            detail: 'Review sensitive admin changes after moderation, payout, or config work.',
            action: 'Open audit',
            tab: 'audit',
        },
    ].filter(Boolean).sort((a, b) => {
        const rank = { critical: 0, warning: 1, info: 2 };
        return rank[a.severity] - rank[b.severity];
    });
    const topTriageItem = triageItems[0];

    const goToOpsItem = (item) => {
        if (!visibleAdminTabs.some(([tab]) => tab === item.tab)) {
            addToast('Your admin role cannot open that workspace.', 'error');
            return;
        }
        item.subTab?.();
        setActiveTab(item.tab);
    };

    const copyAdminHandoff = () => {
        const handoff = {
            generatedAt: new Date().toISOString(),
            generatedBy: currentUser?.email || currentUser?.id || 'admin',
            role: adminAccess?.role || 'admin',
            permissionMode: adminAccess?.permissionMode || 'unknown',
            activeTab,
            densityMode,
            workspaceLoadedAt,
            opsSnapshot: {
                generatedAt: opsSnapshot?.generatedAt || null,
                pendingReports: pendingReportsCount,
                pendingWithdrawals: pendingWithdrawalsCount,
                pendingWithdrawalAmount: pendingWithdrawalsAmount,
                pendingPayments: pendingPaymentAmount,
                auditRecords: auditCount,
            },
            topPriority: topTriageItem ? {
                severity: topTriageItem.severity,
                label: topTriageItem.label,
                detail: topTriageItem.detail,
                action: topTriageItem.action,
            } : null,
            queues: opsQueue.map(item => ({
                key: item.key,
                label: item.label,
                value: item.value,
                detail: item.detail,
                tone: item.tone,
            })),
            visibleTabs: visibleAdminTabs.map(([, , label]) => label),
        };
        copyToClipboard(JSON.stringify(handoff, null, 2), 'Admin handoff');
    };

    const userFilterChips = [
        { label: 'Search', value: searchQuery, onClear: () => setSearchQuery('') },
        { label: 'Status', value: userFilters.status, displayValue: userFilters.status && userFilters.status.replace(/_/g, ' '), onClear: () => setUserFilters(prev => ({ ...prev, status: '' })) },
        { label: 'Gender', value: userFilters.gender, onClear: () => setUserFilters(prev => ({ ...prev, gender: '' })) },
        { label: 'University', value: userFilters.university, onClear: () => setUserFilters(prev => ({ ...prev, university: '' })) },
        { label: 'Verified', value: userFilters.verified, displayValue: userFilters.verified === 'true' ? 'verified' : userFilters.verified === 'false' ? 'unverified' : '', onClear: () => setUserFilters(prev => ({ ...prev, verified: '' })) },
        { label: 'Premium', value: userFilters.premium, displayValue: userFilters.premium === 'true' ? 'premium' : userFilters.premium === 'false' ? 'free' : '', onClear: () => setUserFilters(prev => ({ ...prev, premium: '' })) },
    ];

    const contentFilterChips = [
        { label: 'Search', value: contentFilters.search, onClear: () => updateContentFilter('search', '') },
        { label: 'University', value: contentFilters.university, onClear: () => updateContentFilter('university', '') },
        contentSubTab === 'reports' && { label: 'Report status', value: contentFilters.reportStatus, onClear: () => updateContentFilter('reportStatus', '') },
        { label: 'From', value: contentFilters.from, onClear: () => updateContentFilter('from', '') },
        { label: 'To', value: contentFilters.to, onClear: () => updateContentFilter('to', '') },
    ].filter(Boolean);

    const txnFilterChips = [
        { label: 'Search', value: txnFilter.search, onClear: () => setTxnFilter(prev => ({ ...prev, search: '' })) },
        { label: 'University', value: txnFilter.university, onClear: () => setTxnFilter(prev => ({ ...prev, university: '' })) },
        { label: 'Gender', value: txnFilter.gender, onClear: () => setTxnFilter(prev => ({ ...prev, gender: '' })) },
        { label: 'Type', value: txnFilter.type, onClear: () => setTxnFilter(prev => ({ ...prev, type: '' })) },
        { label: 'Status', value: txnFilter.status, onClear: () => setTxnFilter(prev => ({ ...prev, status: '' })) },
        { label: 'Source', value: txnFilter.source, displayValue: txnFilter.source && txnFilter.source.replace(/_/g, ' '), onClear: () => setTxnFilter(prev => ({ ...prev, source: '' })) },
        { label: 'From', value: txnFilter.from, onClear: () => setTxnFilter(prev => ({ ...prev, from: '' })) },
        { label: 'To', value: txnFilter.to, onClear: () => setTxnFilter(prev => ({ ...prev, to: '' })) },
    ];

    const payoutFilterChips = [
        { label: 'Search', value: payoutFilters.search, onClear: () => updatePayoutFilter('search', '') },
        { label: 'Status', value: payoutFilters.status, onClear: () => updatePayoutFilter('status', '') },
        { label: 'From', value: payoutFilters.from, onClear: () => updatePayoutFilter('from', '') },
        { label: 'To', value: payoutFilters.to, onClear: () => updatePayoutFilter('to', '') },
    ];

    const promoFilterChips = [
        { label: 'Search', value: promoFilters.search, onClear: () => updatePromoFilter('search', '') },
        { label: 'Status', value: promoFilters.status, displayValue: promoFilters.status && promoFilters.status.replace(/_/g, ' '), onClear: () => updatePromoFilter('status', '') },
    ];

    const auditFilterChips = [
        { label: 'Search', value: auditFilters.search, onClear: () => updateAuditFilter('search', '') },
        { label: 'Admin', value: auditFilters.admin, onClear: () => updateAuditFilter('admin', '') },
        { label: 'Action', value: auditFilters.action, displayValue: auditFilters.action && auditFilters.action.replace(/^admin_/, '').replace(/_/g, ' '), onClear: () => updateAuditFilter('action', '') },
        { label: 'Target', value: auditFilters.targetType, displayValue: auditFilters.targetType && auditFilters.targetType.replace(/_/g, ' '), onClear: () => updateAuditFilter('targetType', '') },
        { label: 'From', value: auditFilters.from, onClear: () => updateAuditFilter('from', '') },
        { label: 'To', value: auditFilters.to, onClear: () => updateAuditFilter('to', '') },
    ];
    const auditQuickFilters = [
        { label: 'User status', detail: 'Ban, shadow, verify changes', filters: { targetType: 'profile' } },
        { label: 'Payout decisions', detail: 'Approve/reject withdrawals', filters: { targetType: 'withdrawal' } },
        { label: 'Content decisions', detail: 'Deletes and report dismissals', filters: { targetType: 'confession_report' } },
        { label: 'Config changes', detail: 'Feature flags and settings', filters: { targetType: 'app_config' } },
        { label: 'Push broadcasts', detail: 'Tests and campaigns', filters: { targetType: 'push_broadcast' } },
        { label: 'Admin access', detail: 'Permission changes', filters: { targetType: 'admin_access' } },
    ];

    const openWorkspace = (tab, options = {}) => {
        if (!visibleAdminTabs.some(([visibleTab]) => visibleTab === tab)) {
            addToast('Your admin role cannot open that workspace.', 'error');
            return;
        }
        options.beforeOpen?.();
        setActiveTab(tab);
    };

    const commandPaletteCommands = [
        {
            id: 'overview',
            group: 'Jump',
            label: 'Open overview',
            description: 'Return to the admin control tower and ops queue.',
            keywords: ['dashboard', 'home', 'metrics'],
            run: () => openWorkspace('overview'),
        },
        {
            id: 'copy-handoff',
            group: 'Handoff',
            label: 'Copy admin handoff',
            description: 'Copy current queues, priorities, role, and workspace freshness as JSON.',
            keywords: ['handoff', 'shift', 'snapshot', 'ops'],
            run: copyAdminHandoff,
        },
        adminPermissionFlags.readFinance && {
            id: 'analytics',
            group: 'Finance',
            label: 'Open analytics',
            description: 'View verified cash, wallet activity, and reporting breakdowns.',
            keywords: ['revenue', 'cash', 'metrics'],
            run: () => openWorkspace('analytics'),
        },
        adminPermissionFlags.readFinance && {
            id: 'analytics-export',
            group: 'Finance',
            label: 'Export analytics report',
            description: 'Download signups, revenue, spend, campus, and spender analytics as CSV.',
            keywords: ['revenue', 'cash', 'metrics', 'csv', 'report'],
            run: () => {
                openWorkspace('analytics');
                exportAnalyticsReport();
            },
        },
        adminPermissionFlags.readUsers && {
            id: 'users',
            group: 'Users',
            label: 'Search users',
            description: 'Open User Management with the last saved search and filters.',
            keywords: ['profile', 'account', 'ban', 'verify', 'shadow'],
            run: () => openWorkspace('users'),
        },
        adminPermissionFlags.readUsers && {
            id: 'users-selected-export',
            group: 'Users',
            label: 'Export selected users',
            description: 'Download the currently selected user cohort as CSV.',
            keywords: ['profile', 'account', 'bulk', 'csv', 'selected'],
            run: () => {
                openWorkspace('users');
                exportSelectedUsers();
            },
        },
        adminPermissionFlags.moderateUsers && {
            id: 'banned-users',
            group: 'Users',
            label: 'Show banned users',
            description: 'Filter User Management to banned accounts.',
            keywords: ['moderation', 'appeals', 'status'],
            run: () => {
                const filters = { status: 'banned', gender: '', university: '', verified: '', premium: '' };
                setSearchQuery('');
                setUserFilters(filters);
                openWorkspace('users');
                searchUsers(0, '', filters);
            },
        },
        adminPermissionFlags.moderateContent && {
            id: 'reports',
            group: 'Content',
            label: 'Review pending reports',
            description: 'Open the reports queue with pending moderation reports.',
            keywords: ['confessions', 'moderation', 'abuse'],
            run: () => openWorkspace('content', {
                beforeOpen: () => {
                    setContentSubTab('reports');
                    setContentFilters(prev => ({ ...prev, reportStatus: 'pending' }));
                },
            }),
        },
        adminPermissionFlags.moderateContent && {
            id: 'confessions',
            group: 'Content',
            label: 'Browse confessions',
            description: 'Open all confessions with current content filters.',
            keywords: ['posts', 'secrets', 'content'],
            run: () => openWorkspace('content', { beforeOpen: () => setContentSubTab('all') }),
        },
        adminPermissionFlags.moderateContent && {
            id: 'content-copy-json',
            group: 'Content',
            label: 'Copy moderation queue JSON',
            description: 'Copy the currently visible reports or confessions with filters and page context.',
            keywords: ['posts', 'reports', 'moderation', 'json', 'handoff'],
            run: () => {
                openWorkspace('content');
                copyVisibleModerationQueueSummary();
            },
        },
        adminPermissionFlags.moderateContent && {
            id: 'keywords-export',
            group: 'Content',
            label: 'Export keyword rules',
            description: 'Download the currently visible banned keyword rules as CSV.',
            keywords: ['keywords', 'banned', 'moderation', 'csv', 'rules'],
            run: () => {
                openWorkspace('content', { beforeOpen: () => setContentSubTab('keywords') });
                exportKeywordRules();
            },
        },
        adminPermissionFlags.readFinance && {
            id: 'payouts',
            group: 'Finance',
            label: 'Review payouts',
            description: 'Open withdrawal requests and payout liability.',
            keywords: ['withdrawals', 'bank', 'liability'],
            run: () => openWorkspace('finance', { beforeOpen: () => setFinanceSubTab('payouts') }),
        },
        adminPermissionFlags.readFinance && {
            id: 'ledger',
            group: 'Finance',
            label: 'Open transaction ledger',
            description: 'Inspect wallet, Paystack, Google Play, and RevenueCat rows.',
            keywords: ['transactions', 'payments', 'reference'],
            run: () => openWorkspace('finance', { beforeOpen: () => setFinanceSubTab('ledger') }),
        },
        adminPermissionFlags.writePromo && {
            id: 'promo',
            group: 'Growth',
            label: 'Manage promo codes',
            description: 'Create, review, or deactivate promo campaigns.',
            keywords: ['discount', 'campaign', 'coupon'],
            run: () => openWorkspace('finance', { beforeOpen: () => setFinanceSubTab('promo') }),
        },
        adminPermissionFlags.writePromo && {
            id: 'promo-export',
            group: 'Growth',
            label: 'Export promo codes',
            description: 'Download the currently filtered promo campaign rows as CSV.',
            keywords: ['discount', 'campaign', 'coupon', 'csv', 'report'],
            run: () => {
                openWorkspace('finance', { beforeOpen: () => setFinanceSubTab('promo') });
                exportVisiblePromoCodes();
            },
        },
        adminPermissionFlags.broadcastPush && {
            id: 'push',
            group: 'Comms',
            label: 'Open push broadcaster',
            description: 'Preview, test, and send audited push notifications.',
            keywords: ['notification', 'broadcast', 'message'],
            run: () => openWorkspace('controls'),
        },
        adminPermissionFlags.broadcastPush && {
            id: 'push-history-export',
            group: 'Comms',
            label: 'Export push history',
            description: 'Download recent push test and broadcast activity as CSV.',
            keywords: ['notification', 'broadcast', 'message', 'csv', 'history'],
            run: () => {
                openWorkspace('controls');
                exportPushHistory();
            },
        },
        adminPermissionFlags.writeConfig && {
            id: 'config',
            group: 'Config',
            label: 'Open app controls',
            description: 'Manage feature flags, banners, and app settings.',
            keywords: ['settings', 'maintenance', 'banner'],
            run: () => openWorkspace('controls'),
        },
        adminPermissionFlags.writeConfig && {
            id: 'config-snapshot',
            group: 'Config',
            label: 'Export config snapshot',
            description: 'Download current feature flags, swipe limits, and banner state as CSV.',
            keywords: ['settings', 'snapshot', 'export', 'maintenance', 'banner'],
            run: () => {
                openWorkspace('controls');
                exportConfigSnapshot();
            },
        },
        adminPermissionFlags.manageAdminAccess && {
            id: 'access',
            group: 'Security',
            label: 'Manage admin access',
            description: 'Owner-only admin role and permission management.',
            keywords: ['permissions', 'roles', 'owner'],
            run: () => openWorkspace('controls'),
        },
        adminPermissionFlags.manageAdminAccess && {
            id: 'access-export',
            group: 'Security',
            label: 'Export admin access',
            description: 'Download the current admin access list as CSV.',
            keywords: ['permissions', 'roles', 'owner', 'export'],
            run: () => {
                openWorkspace('controls');
                exportAdminAccessList();
            },
        },
        adminPermissionFlags.readAudit && {
            id: 'audit',
            group: 'Audit',
            label: 'Search audit logs',
            description: 'Open sensitive action logs with filters and CSV export.',
            keywords: ['trail', 'reason', 'history'],
            run: () => openWorkspace('audit'),
        },
        adminPermissionFlags.readAudit && {
            id: 'audit-payouts',
            group: 'Audit',
            label: 'Audit payout decisions',
            description: 'Open audit logs filtered to withdrawal approvals and rejections.',
            keywords: ['payout', 'withdrawal', 'audit'],
            run: () => openWorkspace('audit', { beforeOpen: () => applyAuditQuickFilter({ targetType: 'withdrawal' }) }),
        },
        adminPermissionFlags.readAudit && {
            id: 'audit-access',
            group: 'Audit',
            label: 'Audit admin access changes',
            description: 'Open audit logs filtered to admin permission changes.',
            keywords: ['permissions', 'roles', 'owner', 'audit'],
            run: () => openWorkspace('audit', { beforeOpen: () => applyAuditQuickFilter({ targetType: 'admin_access' }) }),
        },
        {
            id: 'toggle-density',
            group: 'View',
            label: densityMode === 'compact' ? 'Switch to comfortable density' : 'Switch to compact density',
            description: 'Change table and control spacing for scanning or detailed review.',
            keywords: ['compact', 'comfortable', 'spacing', 'table'],
            run: () => setDensityMode(mode => mode === 'compact' ? 'comfortable' : 'compact'),
        },
        {
            id: 'reset-workspace',
            group: 'Utility',
            label: 'Reset saved admin workspace',
            description: 'Clear remembered tabs, filters, pages, and saved searches on this device.',
            keywords: ['clear', 'filters', 'local storage', 'prefs'],
            run: resetAdminWorkspace,
        },
    ].filter(Boolean);

    useEffect(() => {
        const isTypingTarget = (target) => {
            const tagName = target?.tagName?.toLowerCase();
            return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target?.isContentEditable;
        };
        const handleKeyDown = (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                setCommandPaletteOpen(true);
                return;
            }
            if (event.key === '/' && !isTypingTarget(event.target)) {
                event.preventDefault();
                setCommandPaletteOpen(true);
                return;
            }
            if (event.key === 'Escape') setCommandPaletteOpen(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const toggleSelectUser = (id) => {
        setSelectedUsers(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const selectAll = () => setSelectedUsers(new Set(usersList.map(u => u.id)));
    const clearSelection = () => setSelectedUsers(new Set());

    // Render
    return (
        <div className={`admin-dashboard density-${densityMode}`}>
            <header className="admin-header">
                <div className="admin-logo-area">
                    <button
                        className="sidebar-toggle"
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        aria-label="Toggle Sidebar"
                    >
                        {isSidebarOpen ? 'Close' : 'Menu'}
                    </button>
                    <span className="admin-icon">Admin</span>
                    <h1>Control Tower</h1>
                </div>
                <div className="admin-user">
                    <div className="admin-freshness">
                        <span>{workspaceLabels[activeTab] || 'Workspace'} updated {fmtTime(activeWorkspaceLoadedAt)}</span>
                        <button type="button" onClick={refreshCurrentWorkspace} disabled={isRefreshingWorkspace}>
                            {isRefreshingWorkspace ? 'Refreshing' : 'Refresh'}
                        </button>
                    </div>
                    <button
                        type="button"
                        className="admin-density-toggle"
                        onClick={() => setDensityMode(mode => mode === 'compact' ? 'comfortable' : 'compact')}
                        title="Toggle admin density"
                    >
                        {densityMode === 'compact' ? 'Compact' : 'Comfort'}
                    </button>
                    <button
                        type="button"
                        className="admin-command-trigger"
                        onClick={() => setCommandPaletteOpen(true)}
                        title="Open command palette"
                    >
                        Quick jump <kbd>Ctrl</kbd><kbd>K</kbd>
                    </button>
                    <span>Admin: {currentUser?.email}</span>
                    {adminAccess?.role && (
                        <span className={`admin-access-pill ${adminAccess.permissionMode === 'explicit_permissions' ? 'restricted' : 'full'}`}>
                            {adminAccess.role.replace(/_/g, ' ')}
                        </span>
                    )}
                </div>
            </header>

            <div className={`admin-content ${isSidebarOpen ? 'sidebar-open' : ''}`}>
                {isSidebarOpen && (
                    <div className="admin-sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />
                )}
                <nav className={`admin-sidebar ${isSidebarOpen ? 'open' : ''}`}>
                    {visibleAdminTabs.map(([tab, icon, label]) => (
                        <button key={tab} className={`admin-nav-item ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                            <span className="admin-nav-label">{icon} {label}</span>
                            {navBadges[tab] > 0 && <span className="admin-nav-badge">{fmt(navBadges[tab])}</span>}
                        </button>
                    ))}
                </nav>

                <main className="admin-main">
                    {!visibleAdminTabs.some(([tab]) => tab === activeTab) && (
                        <div className="admin-panel animate-fade-in-up">
                            <div className="admin-card admin-access-empty">
                                <h2>Access Limited</h2>
                                <p className="admin-subtitle">
                                    Your admin role does not include this workspace. Use the available sections in the sidebar or ask an owner to adjust your permissions.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* OVERVIEW */}
                    {activeTab === 'overview' && (
                        <div className="admin-panel animate-fade-in-up">
                            <div className="panel-header-row">
                                <div>
                                    <h2>Executive Overview</h2>
                                    {opsSnapshotUpdatedAt && <p className="admin-panel-meta">Ops snapshot refreshed {opsSnapshotUpdatedAt}</p>}
                                </div>
                                <div className="panel-header-actions">
                                    <button className="btn-action" onClick={copyAdminHandoff}>Copy handoff</button>
                                    <button className="btn-refresh" onClick={loadStats}>Refresh</button>
                                </div>
                            </div>
                            {loadingStats ? <div className="admin-loading">Loading metrics...</div> : (
                                <>
                                    <div className={`admin-triage-strip ${topTriageItem ? topTriageItem.severity : 'ok'}`}>
                                        {topTriageItem ? (
                                            <>
                                                <div>
                                                    <span className="admin-triage-eyebrow">{topTriageItem.severity === 'critical' ? 'Highest priority' : 'Next recommended'}</span>
                                                    <strong>{topTriageItem.label}</strong>
                                                    <p>{topTriageItem.detail}</p>
                                                </div>
                                                <button type="button" className="btn-action primary" onClick={() => goToOpsItem(topTriageItem)}>
                                                    {topTriageItem.action}
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <div>
                                                    <span className="admin-triage-eyebrow">All clear</span>
                                                    <strong>No urgent admin queues are visible</strong>
                                                    <p>Reports, payouts, pending payments, push drafts, and audit review queues are clear for your current role.</p>
                                                </div>
                                                <button type="button" className="btn-action" onClick={refreshCurrentWorkspace}>Refresh overview</button>
                                            </>
                                        )}
                                    </div>
                                    {triageItems.length > 1 && (
                                        <div className="admin-triage-list">
                                            {triageItems.slice(1, 4).map(item => (
                                                <button key={item.key} type="button" className={`admin-triage-chip ${item.severity}`} onClick={() => goToOpsItem(item)}>
                                                    <span>{item.label}</span>
                                                    <strong>{item.action}</strong>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    <div className="ops-queue-grid">
                                        {opsQueue.map(item => (
                                            <button
                                                key={item.key}
                                                type="button"
                                                className={`ops-queue-card ${item.tone}`}
                                                onClick={() => goToOpsItem(item)}
                                            >
                                                <span className="ops-queue-label">{item.label}</span>
                                                <strong>{item.value}</strong>
                                                <span className="ops-queue-detail">{item.detail}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="metric-cards-grid">
                                        <div className="metric-card verified-metric">
                                            <h3>Verified Cash</h3>
                                            <div className="metric-value">{fmtCurrency(stats?.verifiedCashRevenue ?? stats?.totalRevenue)}</div>
                                            <div className="metric-subtext">Completed external payments</div>
                                        </div>
                                        <div className="metric-card">
                                            <h3>Today Verified</h3>
                                            <div className="metric-value">{fmtCurrency(stats?.todayVerifiedCashRevenue ?? stats?.todayRevenue)}</div>
                                            <div className="metric-subtext">Completed today</div>
                                        </div>
                                        <div className="metric-card">
                                            <h3>App Spend</h3>
                                            <div className="metric-value">{fmtCurrency(stats?.appSpendRevenue)}</div>
                                            <div className="metric-subtext">Swipes, gifts, boosts</div>
                                        </div>
                                        <div className="metric-card caution-metric">
                                            <h3>Wallet Spend Counter</h3>
                                            <div className="metric-value">{fmtCurrency(stats?.walletSpendCounter)}</div>
                                            <div className="metric-subtext">Leaderboard counter, not cash</div>
                                        </div>
                                        <div className="metric-card">
                                            <h3>Pending Payments</h3>
                                            <div className="metric-value">{fmtCurrency(stats?.pendingPayments)}</div>
                                            <div className="metric-subtext">Unverified Paystack/checkout rows</div>
                                        </div>
                                        <div className="metric-card">
                                            <h3>Google Play Gross</h3>
                                            <div className="metric-value">{fmtCurrency(stats?.googlePlayGross)}</div>
                                            <div className="metric-subtext">{fmtCurrency(stats?.googlePlayUnclassifiedGross)} lacks environment tag</div>
                                        </div>
                                        <div className="metric-card highlight-metric">
                                            <h3>Payout Liability</h3>
                                            <div className="metric-value">{fmtCurrency(stats?.payoutLiability ?? stats?.pendingPayouts)}</div>
                                            <div className="metric-subtext">Female available + pending balances</div>
                                        </div>
                                        <div className="metric-card"><h3>DAU</h3><div className="metric-value">{fmt(stats?.dau)}</div><div className="metric-subtext">Active last 24h</div></div>
                                    </div>
                                    <div className="admin-charts-section">
                                        <div className="leaderboard-card">
                                            <h3>Campus Leaderboard</h3>
                                            <div className="campus-list">
                                                {(stats?.universityStats || []).length === 0 ? (
                                                    <AdminEmptyState
                                                        title="No campus data yet"
                                                        body="Campus counts will appear after the overview metrics load."
                                                        actionLabel="Refresh overview"
                                                        onAction={loadStats}
                                                    />
                                                ) : stats.universityStats.map((u, i) => (
                                                    <div key={i} className="campus-row">
                                                        <span className="campus-name">{u.university}</span>
                                                        <span className="campus-count">{u.count} users</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* ANALYTICS */}
                    {activeTab === 'analytics' && adminPermissionFlags.readFinance && (
                        <div className="admin-panel animate-fade-in-up">
                            <div className="panel-header-row">
                                <h2>Analytics & Reporting</h2>
                                <div className="panel-header-actions">
                                    <button className="btn-action primary" disabled={!analytics} onClick={exportAnalyticsReport}>Export CSV</button>
                                    <button className="btn-refresh" onClick={loadAnalytics}>Refresh</button>
                                </div>
                            </div>
                            {loadingAnalytics ? <div className="admin-loading">Loading analytics...</div> : !analytics ? (
                                <AdminEmptyState
                                    title="No analytics loaded yet"
                                    body="Refresh analytics to load finance-safe reporting metrics for your admin role."
                                    actionLabel="Refresh analytics"
                                    onAction={loadAnalytics}
                                />
                            ) : (
                                <div className="analytics-grid">
                                    <div className="analytics-snapshot full-width" aria-label="Analytics operator snapshot">
                                        <div className="analytics-snapshot-card">
                                            <span>7-day signups</span>
                                            <strong>{fmt(analyticsSummary?.signupTotal)}</strong>
                                            <small>New campus accounts captured by the analytics RPC.</small>
                                        </div>
                                        <div className="analytics-snapshot-card success">
                                            <span>Verified cash</span>
                                            <strong>{fmtCurrency(analyticsSummary?.verifiedCashTotal)}</strong>
                                            <small>Cash confirmed by verified payment records only.</small>
                                        </div>
                                        <div className="analytics-snapshot-card warning">
                                            <span>App spend</span>
                                            <strong>{fmtCurrency(analyticsSummary?.appSpendTotal)}</strong>
                                            <small>In-app wallet/economy usage, separate from real cash.</small>
                                        </div>
                                        <div className="analytics-snapshot-card">
                                            <span>Transaction rows</span>
                                            <strong>{fmt(analyticsSummary?.transactionCount)}</strong>
                                            <small>Rows represented in the breakdown table below.</small>
                                        </div>
                                        <div className="analytics-snapshot-card">
                                            <span>Top campus</span>
                                            <strong>{analyticsSummary?.topCampus?.university || 'None yet'}</strong>
                                            <small>{analyticsSummary?.topCampus ? `${fmt(analyticsSummary.topCampus.user_count)} users in this report.` : 'No university segment available yet.'}</small>
                                        </div>
                                        <div className="analytics-snapshot-card">
                                            <span>Top spender</span>
                                            <strong>{analyticsSummary?.topSpender?.full_name || 'None yet'}</strong>
                                            <small>{analyticsSummary?.topSpender ? `${fmtK(analyticsSummary.topSpender.total_spent)} wallet spend counter.` : 'No spender row available yet.'}</small>
                                        </div>
                                        <div className="analytics-snapshot-card">
                                            <span>Gender balance</span>
                                            <strong>{analyticsSummary?.malePct ?? 0}% / {analyticsSummary?.femalePct ?? 0}%</strong>
                                            <small>Male / female split from available profile data.</small>
                                        </div>
                                        <div className="analytics-snapshot-card muted">
                                            <span>Last loaded</span>
                                            <strong>{analyticsSummary?.loadedAt ? fmtTime(analyticsSummary.loadedAt) : 'Now'}</strong>
                                            <small>Use Refresh for live data, Export CSV for a workbook copy.</small>
                                        </div>
                                    </div>
                                    {/* Signups Chart */}
                                    <div className="admin-card">
                                        <h3>New Signups (Last 7 Days)</h3>
                                        <BarChart data={analytics?.dailySignups || []} labelKey="date" valueKey="count" color="#38bdf8" />
                                    </div>
                                    {/* Verified Cash Chart */}
                                    <div className="admin-card">
                                        <h3>Verified Cash (Last 7 Days)</h3>
                                        <BarChart data={analytics?.dailyRevenue || []} labelKey="date" valueKey="total" color="#4ade80" prefix="NGN " />
                                    </div>
                                    {/* App Spend Chart */}
                                    <div className="admin-card">
                                        <h3>App Spend (Last 7 Days)</h3>
                                        <BarChart data={analytics?.dailyAppSpend || []} labelKey="date" valueKey="total" color="#fbbf24" prefix="NGN " />
                                    </div>
                                    {/* Gender Split */}
                                    <div className="admin-card">
                                        <h3>Gender Split</h3>
                                        <div className="gender-split">
                                            <div className="gender-bar-row">
                                                <span>Male</span>
                                                <div className="gender-bar-bg">
                                                    <div className="gender-bar male" style={{ width: `${(analytics?.genderSplit?.male / Math.max(analytics?.genderSplit?.male + analytics?.genderSplit?.female, 1)) * 100}%` }} />
                                                </div>
                                                <span>{fmt(analytics?.genderSplit?.male)}</span>
                                            </div>
                                            <div className="gender-bar-row">
                                                <span>Female</span>
                                                <div className="gender-bar-bg">
                                                    <div className="gender-bar female" style={{ width: `${(analytics?.genderSplit?.female / Math.max(analytics?.genderSplit?.male + analytics?.genderSplit?.female, 1)) * 100}%` }} />
                                                </div>
                                                <span>{fmt(analytics?.genderSplit?.female)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Top Spenders */}
                                    <div className="admin-card">
                                        <h3>Top Spenders</h3>
                                        <p className="admin-card-note">Wallet spend counter; excludes banned and hidden test accounts.</p>
                                        <div className="top-spenders-list">
                                            {(analytics?.topSpenders || []).length === 0 ? (
                                                <AdminEmptyState
                                                    title="No spender rows yet"
                                                    body="Wallet spend leaderboards will appear after users complete in-app spend actions."
                                                />
                                            ) : (analytics?.topSpenders || []).map((s, i) => (
                                                <div key={i} className="top-spender-row">
                                                    <span className="ts-rank">#{i + 1}</span>
                                                    <span className="ts-name">{s.full_name}</span>
                                                    <span className="ts-uni">{s.university}</span>
                                                    <span className="ts-amount">{fmtK(s.total_spent)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    {/* Revenue Breakdown */}
                                    <div className="admin-card full-width">
                                        <h3>Revenue & Wallet Activity Breakdown</h3>
                                        <div className="admin-table-container" style={{ marginTop: 0 }}>
                                            <table className="admin-table">
                                                <thead><tr><th>Source</th><th>Type</th><th>Status</th><th>Count</th><th>Total</th></tr></thead>
                                                <tbody>
                                                    {(analytics?.revenueBreakdown || []).length === 0 ? (
                                                        <tr>
                                                            <td colSpan="5">
                                                                <AdminEmptyState
                                                                    title="No revenue activity yet"
                                                                    body="Verified cash, wallet spend, and pending payment rows will appear here once transactions exist."
                                                                />
                                                            </td>
                                                        </tr>
                                                    ) : analytics.revenueBreakdown.map((row, i) => (
                                                        <tr key={`${row.payment_method}-${row.type}-${row.status}-${i}`}>
                                                            <td>{row.payment_method}</td>
                                                            <td>{row.type}</td>
                                                            <td><span className={`status-badge ${statusClass(row.status)}`}>{row.status}</span></td>
                                                            <td>{fmt(row.count)}</td>
                                                            <td>{fmtCurrency(row.total)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                    {/* University Stats */}
                                    <div className="admin-card full-width">
                                        <h3>University Breakdown</h3>
                                        <div className="admin-table-container" style={{ marginTop: 0 }}>
                                            <table className="admin-table">
                                                <thead><tr><th>University</th><th>Total Users</th><th>Males</th><th>Females</th></tr></thead>
                                                <tbody>
                                                    {(analytics?.universityStats || []).length === 0 ? (
                                                        <tr>
                                                            <td colSpan="4">
                                                                <AdminEmptyState
                                                                    title="No university breakdown yet"
                                                                    body="University segmentation will appear after profile data is available."
                                                                />
                                                            </td>
                                                        </tr>
                                                    ) : (analytics?.universityStats || []).map((u, i) => (
                                                        <tr key={i}>
                                                            <td>{u.university}</td>
                                                            <td>{fmt(u.user_count)}</td>
                                                            <td>{fmt(u.males)}</td>
                                                            <td>{fmt(u.females)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* USER MANAGEMENT */}
                    {activeTab === 'users' && adminPermissionFlags.readUsers && (
                        <div className="admin-panel animate-fade-in-up">
                            <div className="panel-header-row">
                                <div>
                                    <h2>User Management</h2>
                                    <p className="admin-subtitle">Search, filter, export, and apply audited account actions.</p>
                                </div>
                                <button className="btn-refresh" onClick={() => searchUsers(userPage)}>Refresh</button>
                            </div>
                            <div className="user-summary-grid">
                                <button type="button" onClick={() => applyUserSummaryFilter({ status: '', verified: '', premium: '' })}>
                                    <span>Total matching</span>
                                    <strong>{fmt(userTotal || userSummary.total)}</strong>
                                </button>
                                <button type="button" onClick={() => applyUserSummaryFilter({ status: 'active' })}>
                                    <span>Active</span>
                                    <strong className="credit">{fmt(userSummary.active)}</strong>
                                </button>
                                <button type="button" onClick={() => applyUserSummaryFilter({ status: 'banned' })}>
                                    <span>Banned</span>
                                    <strong className="debit">{fmt(userSummary.banned)}</strong>
                                </button>
                                <button type="button" onClick={() => applyUserSummaryFilter({ status: 'shadow' })}>
                                    <span>Shadow</span>
                                    <strong>{fmt(userSummary.shadow)}</strong>
                                </button>
                                <button type="button" onClick={() => addToast('Use the Status filters or open dossiers to review attention reasons.', 'success')}>
                                    <span>Needs review</span>
                                    <strong className="debit">{fmt(userSummary.needsReview)}</strong>
                                </button>
                                <button type="button" onClick={() => applyUserSummaryFilter({ verified: 'true' })}>
                                    <span>Verified</span>
                                    <strong>{fmt(userSummary.verified)}</strong>
                                </button>
                                <button type="button" onClick={() => applyUserSummaryFilter({ premium: 'true' })}>
                                    <span>Premium</span>
                                    <strong>{fmt(userSummary.premium)}</strong>
                                </button>
                            </div>
                            <div className="user-filter-panel">
                                <div className="user-search-bar">
                                    <input type="text" placeholder="Search by name, email, or user ID..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && applyUserFilters()} className="admin-search-input" />
                                    <button className="btn-search" onClick={applyUserFilters}>Search</button>
                                </div>
                                <div className="user-filter-grid">
                                    <label>
                                        <span>Status</span>
                                        <select className="admin-input" value={userFilters.status} onChange={e => setUserFilters(p => ({ ...p, status: e.target.value }))}>
                                            <option value="">All statuses</option>
                                            <option value="active">Active</option>
                                            <option value="banned">Banned</option>
                                            <option value="shadow">Shadow</option>
                                        </select>
                                    </label>
                                    <label>
                                        <span>Gender</span>
                                        <select className="admin-input" value={userFilters.gender} onChange={e => setUserFilters(p => ({ ...p, gender: e.target.value }))}>
                                            <option value="">All genders</option>
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                        </select>
                                    </label>
                                    <label>
                                        <span>University</span>
                                        <input className="admin-input" placeholder="Filter school" value={userFilters.university} onChange={e => setUserFilters(p => ({ ...p, university: e.target.value }))} />
                                    </label>
                                    <label>
                                        <span>Verified</span>
                                        <select className="admin-input" value={userFilters.verified} onChange={e => setUserFilters(p => ({ ...p, verified: e.target.value }))}>
                                            <option value="">Any</option>
                                            <option value="true">Verified</option>
                                            <option value="false">Unverified</option>
                                        </select>
                                    </label>
                                    <label>
                                        <span>Premium</span>
                                        <select className="admin-input" value={userFilters.premium} onChange={e => setUserFilters(p => ({ ...p, premium: e.target.value }))}>
                                            <option value="">Any</option>
                                            <option value="true">Premium</option>
                                            <option value="false">Free</option>
                                        </select>
                                    </label>
                                </div>
                                <div className="user-filter-actions">
                                    <span>
                                        Showing {fmt(usersList.length)} of {fmt(userTotal || usersList.length)} matching users
                                    </span>
                                    <div>
                                        <button className="btn-action" onClick={resetUserFilters}>Clear filters</button>
                                        <button className="btn-action primary" onClick={applyUserFilters}>Apply filters</button>
                                        <button className="btn-action primary" onClick={exportFilteredUsers}>Export visible CSV</button>
                                    </div>
                                </div>
                                <ActiveFilterChips filters={userFilterChips} />
                            </div>

                            {selectedUsers.size > 0 && (
                                <div className="bulk-action-bar">
                                    <div className="bulk-selection-summary">
                                        <strong>{selectedUsers.size} selected</strong>
                                        <span>{fmt(selectedUserSummary.active)} active / {fmt(selectedUserSummary.banned)} banned / {fmt(selectedUserSummary.shadow)} shadow / {fmt(selectedUserSummary.needsReview)} review</span>
                                    </div>
                                    <div className="bulk-action-tools">
                                        <button className="btn-action" onClick={copySelectedUsersSummary}>Copy JSON</button>
                                        <button className="btn-action" onClick={exportSelectedUsers}>Export CSV</button>
                                        <button className="btn-action btn-verify" disabled={!adminPermissionFlags.moderateUsers} onClick={() => bulkAction('verify')}>Bulk Verify</button>
                                        <button className="btn-action btn-ban" disabled={!adminPermissionFlags.moderateUsers} onClick={() => bulkAction('ban')}>Bulk Ban</button>
                                        <button className="btn-action btn-shadow" disabled={!adminPermissionFlags.moderateUsers} onClick={() => bulkAction('shadow')}>Bulk Shadow</button>
                                        <button className="btn-action" style={{ borderColor: '#475569', color: '#94a3b8' }} onClick={clearSelection}>Clear</button>
                                    </div>
                                </div>
                            )}
                            {!adminPermissionFlags.moderateUsers && (
                                <div className="admin-permission-warning">
                                    Your admin role can view users but cannot change user status.
                                </div>
                            )}

                            {loadingUsers ? <div className="admin-loading">Loading users...</div> : (
                                <div className="admin-table-container">
                                    <table className="admin-table">
                                        <thead>
                                            <tr>
                                                <th><input type="checkbox" checked={usersList.length > 0 && selectedUsers.size === usersList.length} onChange={e => e.target.checked ? selectAll() : clearSelection()} /></th>
                                                <th>User</th><th>Gender</th><th>University</th><th>Status</th><th>Attention</th><th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {usersList.length === 0 ? (
                                                <tr>
                                                    <td colSpan="7">
                                                        <AdminEmptyState
                                                            title="No users match this view"
                                                            body="Clear filters, search by email or user ID, or refresh after changing account criteria."
                                                            actionLabel="Clear filters"
                                                            onAction={resetUserFilters}
                                                        />
                                                    </td>
                                                </tr>
                                            ) : (
                                                usersList.map(user => {
                                                    const attention = userAttentionProfile(user);
                                                    return (
                                                        <tr key={user.id} className={user.is_banned ? 'row-banned' : ''}>
                                                            <td><input type="checkbox" checked={selectedUsers.has(user.id)} onChange={() => toggleSelectUser(user.id)} /></td>
                                                            <td>
                                                                <div className="user-cell-info" style={{ cursor: 'pointer' }} onClick={() => setViewUser(user)}>
                                                                    <img src={user.avatar_url || '/default-avatar.png'} alt="" className="admin-avatar" />
                                                                    <div>
                                                                        <strong>{user.full_name} {user.is_verified && <span className="verified-mark">Verified</span>}</strong>
                                                                        <div className="user-email">{user.email}</div>
                                                                        <div className="entity-meta-row compact">
                                                                            <code>{user.id}</code>
                                                                            <button type="button" className="copy-chip" onClick={e => { e.stopPropagation(); copyToClipboard(user.id, 'User ID'); }}>Copy ID</button>
                                                                            {adminPermissionFlags.readAudit && (
                                                                                <button type="button" className="copy-chip" onClick={e => { e.stopPropagation(); openAuditTrail(user.id, 'profile'); }}>Audit</button>
                                                                            )}
                                                                            {adminPermissionFlags.manageAdminAccess && (
                                                                                <button type="button" className="copy-chip accent" onClick={e => { e.stopPropagation(); prepareAdminAccessTarget(user); }}>Use for access</button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="capitalize">{user.gender}</td>
                                                            <td>{user.university}</td>
                                                            <td>
                                                                {user.is_banned && <span className="status-badge banned">Banned</span>}
                                                                {user.is_shadow_banned && <span className="status-badge shadow">Shadow</span>}
                                                                {!user.is_banned && !user.is_shadow_banned && <span className="status-badge active">Active</span>}
                                                                {user.is_premium && <span className="status-badge premium">Premium</span>}
                                                            </td>
                                                            <td>
                                                                <span className={`attention-pill ${attention.tone}`}>{attention.label}</span>
                                                                <div className="attention-reasons">{attention.reasons.length > 0 ? attention.reasons.join(' / ') : 'No flags'}</div>
                                                            </td>
                                                            <td className="actions-cell">
                                                                <button className={`btn-action ${user.is_verified ? 'btn-unverify' : 'btn-verify'}`} disabled={!adminPermissionFlags.moderateUsers} onClick={() => toggleUserStatus(user.id, 'verify', !user.is_verified)}>{user.is_verified ? 'Unverify' : 'Verify'}</button>
                                                                <button className={`btn-action ${user.is_banned ? 'btn-unban' : 'btn-ban'}`} disabled={!adminPermissionFlags.moderateUsers} onClick={() => toggleUserStatus(user.id, 'ban', !user.is_banned)}>{user.is_banned ? 'Unban' : 'Ban'}</button>
                                                                <button className={`btn-action ${user.is_shadow_banned ? 'btn-unshadow' : 'btn-shadow'}`} disabled={!adminPermissionFlags.moderateUsers} onClick={() => toggleUserStatus(user.id, 'shadow', !user.is_shadow_banned)}>{user.is_shadow_banned ? 'Unshadow' : 'Shadow'}</button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            {!loadingUsers && usersList.length > 0 && (
                                <div className="user-pagination">
                                    <span>Page {userPage + 1}</span>
                                    <div>
                                        <button className="btn-action" disabled={userPage === 0} onClick={() => searchUsers(userPage - 1)}>Previous</button>
                                        <button className="btn-action" disabled={(userPage + 1) * USER_PAGE_SIZE >= userTotal} onClick={() => searchUsers(userPage + 1)}>Next</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* CONTENT MODERATION */}
                    {activeTab === 'content' && adminPermissionFlags.moderateContent && (
                        <div className="admin-panel animate-fade-in-up">
                            <h2>Content Moderation</h2>
                            {!adminPermissionFlags.moderateContent && contentSubTab !== 'keywords' && (
                                <div className="admin-permission-warning">
                                    Your admin role can view content queues but cannot moderate posts or reports.
                                </div>
                            )}
                            <div className="sub-tab-bar">
                                <button className={`sub-tab-btn ${contentSubTab === 'all' ? 'active' : ''}`} onClick={() => setContentSubTab('all')}>All Confessions ({fmt(confessionTotal || confessions.length)})</button>
                                <button className={`sub-tab-btn ${contentSubTab === 'reports' ? 'active' : ''}`} onClick={() => setContentSubTab('reports')}>
                                    Reports ({fmt(reportTotal || reports.length)}) {pendingReportTotal > 0 && <span className="badge-red">{fmt(pendingReportTotal)} pending</span>}
                                </button>
                                <button className={`sub-tab-btn ${contentSubTab === 'keywords' ? 'active' : ''}`} onClick={() => setContentSubTab('keywords')}>Keyword Filters</button>
                            </div>

                            {contentSubTab !== 'keywords' && (
                                <div className="content-filter-panel">
                                    <div className="content-filter-grid">
                                        <label>
                                            <span>Search</span>
                                            <input
                                                className="admin-input"
                                                placeholder="Content, reason, or ID..."
                                                value={contentFilters.search}
                                                onChange={e => updateContentFilter('search', e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter') applyContentFilters(); }}
                                            />
                                        </label>
                                        <label>
                                            <span>University</span>
                                            <input
                                                className="admin-input"
                                                placeholder="Any university"
                                                value={contentFilters.university}
                                                onChange={e => updateContentFilter('university', e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter') applyContentFilters(); }}
                                                disabled={contentSubTab === 'reports'}
                                            />
                                        </label>
                                        {contentSubTab === 'reports' && (
                                            <label>
                                                <span>Report status</span>
                                                <select className="admin-input" value={contentFilters.reportStatus} onChange={e => updateContentFilter('reportStatus', e.target.value)}>
                                                    <option value="pending">Pending</option>
                                                    <option value="dismissed">Dismissed</option>
                                                    <option value="reviewed">Reviewed</option>
                                                    <option value="">All statuses</option>
                                                </select>
                                            </label>
                                        )}
                                        <label>
                                            <span>From</span>
                                            <input className="admin-input" type="date" value={contentFilters.from} onChange={e => updateContentFilter('from', e.target.value)} />
                                        </label>
                                        <label>
                                            <span>To</span>
                                            <input className="admin-input" type="date" value={contentFilters.to} onChange={e => updateContentFilter('to', e.target.value)} />
                                        </label>
                                    </div>
                                    <div className="content-filter-actions">
                                        <span>
                                            {contentSubTab === 'reports'
                                                ? `Showing ${fmt(reports.length)} of ${fmt(reportTotal || reports.length)} reports`
                                                : `Showing ${fmt(confessions.length)} of ${fmt(confessionTotal || confessions.length)} confessions`}
                                        </span>
                                        <div>
                                            <button className="btn-action" onClick={resetContentFilters}>Clear</button>
                                            <button className="btn-action primary" onClick={applyContentFilters}>Apply filters</button>
                                            <button className="btn-action" disabled={visibleContentRows.length === 0} onClick={copyVisibleModerationQueueSummary}>Copy visible JSON</button>
                                            <button className="btn-action primary" onClick={exportVisibleModerationQueue}>Export visible CSV</button>
                                        </div>
                                    </div>
                                    <ActiveFilterChips filters={contentFilterChips} />
                                </div>
                            )}

                            {loadingConfessions ? <div className="admin-loading">Loading...</div> : (
                                <>
                                    {contentSubTab !== 'keywords' && (
                                        <div className="content-summary-grid">
                                            <div>
                                                <span>Visible</span>
                                                <strong>{fmt(visibleContentSummary.visible)}</strong>
                                            </div>
                                            <div>
                                                <span>Total matches</span>
                                                <strong>{fmt(contentSubTab === 'reports' ? reportTotal || reports.length : confessionTotal || confessions.length)}</strong>
                                            </div>
                                            {contentSubTab === 'reports' && (
                                                <div>
                                                    <span>Pending</span>
                                                    <strong className={visibleContentSummary.pending > 0 ? 'debit' : ''}>{fmt(visibleContentSummary.pending)}</strong>
                                                </div>
                                            )}
                                            <div>
                                                <span>Campuses</span>
                                                <strong>{fmt(visibleContentSummary.universities.size)}</strong>
                                            </div>
                                            <div>
                                                <span>Newest</span>
                                                <strong>{visibleContentSummary.newest ? fmtTime(visibleContentSummary.newest) : 'None'}</strong>
                                            </div>
                                        </div>
                                    )}
                                    {contentSubTab === 'all' && (
                                        <>
                                            <div className="admin-confession-list">
                                                {confessions.length === 0 ? (
                                                    <AdminEmptyState
                                                        title="No confessions match this view"
                                                        body="The queue may be clear, or your filters may be too narrow."
                                                        actionLabel="Clear filters"
                                                        onAction={resetContentFilters}
                                                    />
                                                ) : confessions.map(c => (
                                                    <div key={c.id} className="admin-confession-card">
                                                        <div className="confession-header">
                                                            <div className="confession-author">
                                                                <span>Anonymous - {new Date(c.created_at).toLocaleString()}</span>
                                                                {c.university && <span style={{ opacity: 0.6, fontSize: '11px' }}>{c.university}</span>}
                                                            </div>
                                                            <div className="confession-actions">
                                                                <button className="btn-action" onClick={() => setModerationCase({ type: 'confession', item: c })}>Open case</button>
                                                                <button className="btn-action btn-ban" disabled={!adminPermissionFlags.moderateContent} onClick={() => handleDeleteConfession(c)}>Delete</button>
                                                            </div>
                                                        </div>
                                                        <div className="confession-body">{c.content}</div>
                                                        <div className="entity-meta-row compact">
                                                            <code>{c.id}</code>
                                                            <button type="button" className="copy-chip" onClick={() => copyToClipboard(c.id, 'Confession ID')}>Copy ID</button>
                                                            {adminPermissionFlags.readAudit && <button type="button" className="copy-chip accent" onClick={() => openAuditTrail(c.id, 'confession')}>Audit</button>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            {confessions.length > 0 && (
                                                <div className="content-pagination">
                                                    <span>Page {confessionPage + 1}</span>
                                                    <div>
                                                        <button className="btn-action" disabled={confessionPage === 0} onClick={() => loadConfessions(confessionPage - 1, reportPage)}>Previous</button>
                                                        <button className="btn-action" disabled={(confessionPage + 1) * CONTENT_PAGE_SIZE >= confessionTotal} onClick={() => loadConfessions(confessionPage + 1, reportPage)}>Next</button>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                    {contentSubTab === 'reports' && (
                                        <>
                                            <div className="admin-confession-list">
                                                {reports.length === 0 ? (
                                                    <AdminEmptyState
                                                        title="No reports match this view"
                                                        body="Pending reports are clear for the current filters. Switch status or widen the date range to inspect older decisions."
                                                        actionLabel="Clear filters"
                                                        onAction={resetContentFilters}
                                                    />
                                                ) : reports.map(r => (
                                                    <div key={r.id} className="admin-confession-card report-card">
                                                        <div className="confession-header">
                                                            <span style={{ color: '#f87171', fontSize: '0.8rem' }}>Reported: {r.reason}</span>
                                                            <div className="confession-actions">
                                                                <button className="btn-action" onClick={() => setModerationCase({ type: 'report', item: r })}>Open case</button>
                                                                {r.status === 'pending' ? (
                                                                    <>
                                                                    <button className="btn-action btn-verify" disabled={!adminPermissionFlags.moderateContent} onClick={() => handleDismissReport(r)}>Dismiss</button>
                                                                    <button className="btn-action btn-ban" disabled={!adminPermissionFlags.moderateContent} onClick={() => handleDeleteReported(r)}>Delete Post</button>
                                                                    </>
                                                                ) : (
                                                                    <span className={`status-badge ${statusClass(r.status)}`}>{r.status}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="confession-body">{r.confessions?.content || 'Content unavailable'}</div>
                                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{r.confessions?.university}</div>
                                                        <div className="entity-meta-row compact">
                                                            <code>{r.id}</code>
                                                            <button type="button" className="copy-chip" onClick={() => copyToClipboard(r.id, 'Report ID')}>Copy report</button>
                                                            {r.confession_id && <button type="button" className="copy-chip" onClick={() => copyToClipboard(r.confession_id, 'Confession ID')}>Copy post</button>}
                                                            {adminPermissionFlags.readAudit && <button type="button" className="copy-chip accent" onClick={() => openAuditTrail(r.id, 'confession_report')}>Audit</button>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            {reports.length > 0 && (
                                                <div className="content-pagination">
                                                    <span>Page {reportPage + 1}</span>
                                                    <div>
                                                        <button className="btn-action" disabled={reportPage === 0} onClick={() => loadConfessions(confessionPage, reportPage - 1)}>Previous</button>
                                                        <button className="btn-action" disabled={(reportPage + 1) * CONTENT_PAGE_SIZE >= reportTotal} onClick={() => loadConfessions(confessionPage, reportPage + 1)}>Next</button>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                    {contentSubTab === 'keywords' && (
                                        <div className="admin-card keyword-manager-card">
                                            <div className="keyword-manager-header">
                                                <div>
                                                    <h3>Banned Keywords</h3>
                                                    <p className="admin-card-note">Posts containing these words may be auto-flagged or blocked by moderation rules.</p>
                                                </div>
                                                <div className="keyword-manager-actions">
                                                    <button className="btn-action" disabled={keywords.length === 0} onClick={copyKeywordSummary}>Copy JSON</button>
                                                    <button className="btn-action primary" disabled={filteredKeywords.length === 0} onClick={exportKeywordRules}>Export CSV</button>
                                                </div>
                                            </div>
                                            {!adminPermissionFlags.writeConfig && (
                                                <div className="admin-permission-warning">
                                                    Your admin role can view keywords but cannot edit app configuration.
                                                </div>
                                            )}
                                            <div className="keyword-summary-grid">
                                                <div>
                                                    <span>Total rules</span>
                                                    <strong>{fmt(keywordSummary.total)}</strong>
                                                </div>
                                                <div>
                                                    <span>Visible</span>
                                                    <strong>{fmt(filteredKeywords.length)}</strong>
                                                </div>
                                                <div>
                                                    <span>Single words</span>
                                                    <strong>{fmt(keywordSummary.singleWords)}</strong>
                                                </div>
                                                <div>
                                                    <span>Phrases</span>
                                                    <strong>{fmt(keywordSummary.phrases)}</strong>
                                                </div>
                                                <div>
                                                    <span>Longest</span>
                                                    <strong>{fmt(keywordSummary.longest)} chars</strong>
                                                </div>
                                            </div>
                                            <div className="keyword-control-panel">
                                                <label>
                                                    <span>Search rules</span>
                                                    <input
                                                        className="admin-input"
                                                        placeholder="Find keyword or phrase..."
                                                        value={keywordSearch}
                                                        onChange={e => setKeywordSearch(e.target.value)}
                                                    />
                                                </label>
                                                <label>
                                                    <span>Add keyword</span>
                                                    <input
                                                        className="admin-input"
                                                        placeholder="Add keyword or phrase..."
                                                        value={newKeyword}
                                                        disabled={!adminPermissionFlags.writeConfig}
                                                        onChange={e => setNewKeyword(e.target.value)}
                                                        onKeyDown={e => e.key === 'Enter' && addKeyword()}
                                                    />
                                                </label>
                                                <div className="keyword-control-actions">
                                                    <button className="btn-action" onClick={() => setKeywordSearch('')}>Clear search</button>
                                                    <button className="btn-search" disabled={!adminPermissionFlags.writeConfig || !newKeyword.trim()} onClick={addKeyword}>Add rule</button>
                                                </div>
                                            </div>
                                            <div className="keyword-list">
                                                {filteredKeywords.length === 0 ? (
                                                    <AdminEmptyState
                                                        title={keywords.length === 0 ? 'No keyword rules yet' : 'No keyword rules match this search'}
                                                        body={keywords.length === 0 ? 'Add carefully scoped terms or phrases that reflect real moderation policy.' : 'Clear the search to review all keyword rules.'}
                                                        actionLabel={keywords.length === 0 ? undefined : 'Clear search'}
                                                        onAction={keywords.length === 0 ? undefined : () => setKeywordSearch('')}
                                                    />
                                                ) : filteredKeywords.map(kw => (
                                                    <span key={kw} className="keyword-chip">
                                                        {kw}
                                                        <button disabled={!adminPermissionFlags.writeConfig} onClick={() => removeKeyword(kw)}>x</button>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* FINANCE */}
                    {activeTab === 'finance' && (adminPermissionFlags.readFinance || adminPermissionFlags.writePromo) && (
                        <div className="admin-panel animate-fade-in-up">
                            <div className="panel-header-row">
                                <h2>Financial Controls</h2>
                                <button className="btn-refresh" onClick={loadFinance}>Refresh</button>
                            </div>
                            <div className="sub-tab-bar">
                                {adminPermissionFlags.readFinance && <button className={`sub-tab-btn ${activeFinanceSubTab === 'payouts' ? 'active' : ''}`} onClick={() => setFinanceSubTab('payouts')}>Payout Manager</button>}
                                {adminPermissionFlags.readFinance && <button className={`sub-tab-btn ${activeFinanceSubTab === 'ledger' ? 'active' : ''}`} onClick={() => setFinanceSubTab('ledger')}>Transaction Ledger</button>}
                                {adminPermissionFlags.writePromo && <button className={`sub-tab-btn ${activeFinanceSubTab === 'promo' ? 'active' : ''}`} onClick={() => setFinanceSubTab('promo')}>Promo Codes</button>}
                            </div>

                            {loadingFinance ? <div className="admin-loading">Loading finance data...</div> : (
                                <>
                                    {activeFinanceSubTab === 'payouts' && adminPermissionFlags.readFinance && (
                                        <>
                                            {!adminPermissionFlags.reviewPayouts && (
                                                <div className="admin-permission-warning">
                                                    Your admin role can view payout requests but cannot approve or reject payouts.
                                                </div>
                                            )}
                                            <div className="finance-filter-panel payout-filter-panel">
                                                <div className="finance-filter-grid payout-filter-grid">
                                                    <label>
                                                        <span>Search payouts</span>
                                                        <input
                                                            className="admin-input"
                                                            placeholder="Name, email, user ID, bank..."
                                                            value={payoutFilters.search}
                                                            onChange={e => updatePayoutFilter('search', e.target.value)}
                                                            onKeyDown={e => { if (e.key === 'Enter') applyPayoutFilters(); }}
                                                        />
                                                    </label>
                                                    <label>
                                                        <span>Status</span>
                                                        <select className="admin-input" value={payoutFilters.status} onChange={e => updatePayoutFilter('status', e.target.value)}>
                                                            <option value="">All statuses</option>
                                                            <option value="pending">Pending</option>
                                                            <option value="approved">Approved</option>
                                                            <option value="rejected">Rejected</option>
                                                        </select>
                                                    </label>
                                                    <label>
                                                        <span>From</span>
                                                        <input className="admin-input" type="date" value={payoutFilters.from} onChange={e => updatePayoutFilter('from', e.target.value)} />
                                                    </label>
                                                    <label>
                                                        <span>To</span>
                                                        <input className="admin-input" type="date" value={payoutFilters.to} onChange={e => updatePayoutFilter('to', e.target.value)} />
                                                    </label>
                                                </div>
                                                <div className="finance-filter-actions">
                                                    <span>Showing {fmt(filteredWithdrawals.length)} of {fmt(withdrawals.length)} loaded payout requests</span>
                                                    <button className="btn-action" onClick={resetPayoutFilters}>Clear</button>
                                                    <button className="btn-action primary" onClick={applyPayoutFilters}>Apply filters</button>
                                                    <button className="btn-action primary" onClick={exportVisiblePayouts}>Export visible CSV</button>
                                                </div>
                                                <ActiveFilterChips filters={payoutFilterChips} />
                                            </div>
                                            <div className="payout-request-grid">
                                                <div className="finance-ledger-summary payout-summary">
                                                    <div><span>Visible pending</span><strong>{fmt(payoutVisiblePending.length)}</strong></div>
                                                    <div><span>Visible pending amount</span><strong className="debit">{fmtCurrency(payoutVisiblePending.reduce((sum, w) => sum + Number(w.amount || 0), 0))}</strong></div>
                                                    <div><span>Visible approved</span><strong className="credit">{fmt(payoutVisibleApproved.length)}</strong></div>
                                                    <div><span>Visible rejected</span><strong>{fmt(payoutVisibleRejected.length)}</strong></div>
                                                    <div><span>Total liability</span><strong>{fmtCurrency(wallets.reduce((sum, w) => sum + Number(w.balance || 0), 0))}</strong></div>
                                                </div>
                                                <div className="admin-table-container">
                                                    <table className="admin-table">
                                                        <thead><tr><th>Requester</th><th>Amount</th><th>Bank</th><th>Status</th><th>Requested</th><th>Action</th></tr></thead>
                                                        <tbody>
                                                            {filteredWithdrawals.length === 0 ? (
                                                                <tr>
                                                                    <td colSpan="6">
                                                                        <AdminEmptyState
                                                                            title="No payout requests match this view"
                                                                            body="Try clearing filters, widening the date range, or refreshing before closing a payout review session."
                                                                            actionLabel="Clear payout filters"
                                                                            onAction={resetPayoutFilters}
                                                                        />
                                                                    </td>
                                                                </tr>
                                                            ) : filteredWithdrawals.map(w => (
                                                                <tr key={w.id}>
                                                                    <td>
                                                                        <strong>{w.full_name || 'Unknown'}</strong>
                                                                        <div className="user-email">{w.email || w.user_id}</div>
                                                                        <div className="audit-target-id">{w.university || 'No university'}</div>
                                                                        <button type="button" className="copy-chip" onClick={() => copyToClipboard(w.user_id, 'User ID')}>Copy user ID</button>
                                                                        {adminPermissionFlags.readAudit && <button type="button" className="copy-chip" onClick={() => openAuditTrail(w.id, 'withdrawal')}>Audit payout</button>}
                                                                    </td>
                                                                    <td>{fmtCurrency(w.amount)}</td>
                                                                    <td className="audit-meta">{bankDetailsSummary(w.bank_details)}</td>
                                                                    <td><span className={`status-badge ${statusClass(w.status)}`}>{w.status}</span></td>
                                                                    <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{new Date(w.created_at).toLocaleDateString()}</td>
                                                                    <td>
                                                                        <div className="table-action-row">
                                                                            <button className="btn-action" onClick={() => setPayoutCase(w)}>Review file</button>
                                                                            {w.status === 'pending' ? (
                                                                                <>
                                                                                    <button className="btn-action btn-verify" disabled={!adminPermissionFlags.reviewPayouts} onClick={() => reviewWithdrawal(w, 'approve')}>Approve</button>
                                                                                    <button className="btn-action btn-ban" disabled={!adminPermissionFlags.reviewPayouts} onClick={() => reviewWithdrawal(w, 'reject')}>Reject</button>
                                                                                </>
                                                                            ) : (
                                                                                <span className="audit-meta">{w.processed_at ? `Reviewed ${new Date(w.processed_at).toLocaleDateString()}` : 'Reviewed'}</span>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                            <div className="section-subheading-row">
                                                <h3 className="section-subheading">Wallet Balances</h3>
                                                <button className="btn-action primary" onClick={exportWalletBalances}>Export wallet CSV</button>
                                            </div>
                                            <div className="admin-table-container">
                                                <table className="admin-table">
                                                    <thead><tr><th>Name</th><th>University</th><th>Gender</th><th>Balance</th><th>Available</th><th>Pending</th><th>Earned</th><th>Spent</th><th>Tools</th></tr></thead>
                                                    <tbody>
                                                        {wallets.length === 0 ? (
                                                            <tr>
                                                                <td colSpan="9">
                                                                    <AdminEmptyState
                                                                        title="No wallet rows visible"
                                                                        body="Wallet liability data is empty for your current finance permissions or has not loaded yet."
                                                                        actionLabel="Refresh finance"
                                                                        onAction={loadFinance}
                                                                    />
                                                                </td>
                                                            </tr>
                                                        ) : wallets.map(w => (
                                                            <tr key={w.user_id}>
                                                                <td>
                                                                    <strong>{w.full_name}</strong>
                                                                    <div className="user-email">{w.email || w.user_id}</div>
                                                                </td>
                                                                <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{w.university}</td>
                                                                <td className="capitalize">{w.gender}</td>
                                                                <td>{fmtCurrency(w.balance)}</td>
                                                                <td>{fmtCurrency(w.available_balance)}</td>
                                                                <td>{fmtCurrency(w.pending_balance)}</td>
                                                                <td style={{ color: '#4ade80' }}>{fmtCurrency(w.total_earned)}</td>
                                                                <td style={{ color: '#f87171' }}>{fmtCurrency(w.total_spent)}</td>
                                                                <td>
                                                                    <div className="table-action-row">
                                                                        <button className="btn-action" onClick={() => setViewUser({ id: w.user_id, full_name: w.full_name, email: w.email, university: w.university, gender: w.gender })}>User file</button>
                                                                        <button type="button" className="copy-chip" onClick={() => copyToClipboard(w.user_id, 'User ID')}>Copy ID</button>
                                                                        {adminPermissionFlags.readAudit && <button type="button" className="copy-chip accent" onClick={() => openAuditTrail(w.user_id, 'profile')}>User audit</button>}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </>
                                    )}
                                    {activeFinanceSubTab === 'ledger' && adminPermissionFlags.readFinance && (
                                        <>
                                            <div className="finance-filter-panel">
                                                <div className="finance-filter-grid">
                                                    <label>
                                                        <span>Search</span>
                                                        <input className="admin-input" placeholder="Name, email, ref, description..." value={txnFilter.search} onChange={e => setTxnFilter(p => ({ ...p, search: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') applyTxnFilters(); }} />
                                                    </label>
                                                    <label>
                                                        <span>University</span>
                                                        <input className="admin-input" placeholder="Any university" value={txnFilter.university} onChange={e => setTxnFilter(p => ({ ...p, university: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') applyTxnFilters(); }} />
                                                    </label>
                                                    <label>
                                                        <span>Gender</span>
                                                        <select className="admin-input" value={txnFilter.gender} onChange={e => setTxnFilter(p => ({ ...p, gender: e.target.value }))}>
                                                            <option value="">All genders</option>
                                                            <option value="male">Male</option>
                                                            <option value="female">Female</option>
                                                        </select>
                                                    </label>
                                                    <label>
                                                        <span>Type</span>
                                                        <select className="admin-input" value={txnFilter.type} onChange={e => setTxnFilter(p => ({ ...p, type: e.target.value }))}>
                                                            <option value="">All types</option>
                                                            <option value="credit">Credit</option>
                                                            <option value="debit">Debit</option>
                                                        </select>
                                                    </label>
                                                    <label>
                                                        <span>Status</span>
                                                        <select className="admin-input" value={txnFilter.status} onChange={e => setTxnFilter(p => ({ ...p, status: e.target.value }))}>
                                                            <option value="">All statuses</option>
                                                            <option value="completed">Completed</option>
                                                            <option value="pending">Pending</option>
                                                            <option value="failed">Failed</option>
                                                            <option value="success">Success</option>
                                                        </select>
                                                    </label>
                                                    <label>
                                                        <span>Source</span>
                                                        <select className="admin-input" value={txnFilter.source} onChange={e => setTxnFilter(p => ({ ...p, source: e.target.value }))}>
                                                            <option value="">All sources</option>
                                                            <option value="wallet">Wallet</option>
                                                            <option value="paystack">Paystack</option>
                                                            <option value="google_play">Google Play</option>
                                                            <option value="revenuecat">RevenueCat</option>
                                                        </select>
                                                    </label>
                                                    <label>
                                                        <span>From</span>
                                                        <input className="admin-input" type="date" value={txnFilter.from} onChange={e => setTxnFilter(p => ({ ...p, from: e.target.value }))} />
                                                    </label>
                                                    <label>
                                                        <span>To</span>
                                                        <input className="admin-input" type="date" value={txnFilter.to} onChange={e => setTxnFilter(p => ({ ...p, to: e.target.value }))} />
                                                    </label>
                                                </div>
                                                <div className="finance-filter-actions">
                                                    <span>Showing {fmt(filteredTransactions.length)} of {fmt(txnTotal || filteredTransactions.length)} matching transactions</span>
                                                    <button className="btn-action" onClick={resetTxnFilters}>Clear</button>
                                                    <button className="btn-action primary" onClick={applyTxnFilters}>Apply filters</button>
                                                    <button className="btn-action primary" onClick={exportFilteredTransactions}>Export visible CSV</button>
                                                </div>
                                                <ActiveFilterChips filters={txnFilterChips} />
                                            </div>
                                            <div className="finance-ledger-summary">
                                                <div><span>Total matches</span><strong>{fmt(ledgerTotals.count)}</strong></div>
                                                <div><span>Credits</span><strong className="credit">{fmtCurrency(ledgerTotals.credit)}</strong></div>
                                                <div><span>Debits</span><strong className="debit">{fmtCurrency(ledgerTotals.debit)}</strong></div>
                                                <div><span>Total volume</span><strong>{fmtCurrency(ledgerTotals.total)}</strong></div>
                                            </div>
                                            {loadingTransactions ? <div className="admin-loading">Loading transaction ledger...</div> : (
                                                <>
                                                    <div className="admin-table-container">
                                                        <table className="admin-table">
                                                            <thead><tr><th>User</th><th>University</th><th>Type</th><th>Source</th><th>Amount</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
                                                            <tbody>
                                                                {filteredTransactions.length === 0 ? (
                                                                    <tr>
                                                                        <td colSpan="8">
                                                                            <AdminEmptyState
                                                                                title="No transactions match this ledger view"
                                                                                body="Try clearing filters, widening the dates, or searching by transaction reference."
                                                                                actionLabel="Clear ledger filters"
                                                                                onAction={resetTxnFilters}
                                                                            />
                                                                        </td>
                                                                    </tr>
                                                                ) : filteredTransactions.map(t => (
                                                                    <tr key={t.id}>
                                                                        <td><strong>{t.full_name || 'Unknown'}</strong></td>
                                                                        <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{t.university}</td>
                                                                        <td><span className="status-badge">{t.type}</span></td>
                                                                        <td>{t.payment_method || 'wallet'}</td>
                                                                        <td>{fmtCurrency(t.amount)}</td>
                                                                        <td><span className={`status-badge ${statusClass(t.status)}`}>{t.status}</span></td>
                                                                        <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                                                            {new Date(t.created_at).toLocaleDateString()}
                                                                            {(t.reference_id || t.id) && (
                                                                                <div className="entity-meta-row compact">
                                                                                    <button type="button" className="copy-chip" onClick={() => copyToClipboard(t.reference_id || t.id, t.reference_id ? 'Reference' : 'Transaction ID')}>
                                                                                        Copy ref
                                                                                    </button>
                                                                                </div>
                                                                            )}
                                                                        </td>
                                                                        <td>
                                                                            <button className="btn-action" onClick={() => setTransactionCase(t)}>Details</button>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                    {filteredTransactions.length > 0 && (
                                                        <div className="ledger-pagination">
                                                            <span>Page {txnPage + 1}</span>
                                                            <div>
                                                                <button className="btn-action" disabled={txnPage === 0} onClick={() => loadTransactions(txnPage - 1)}>Previous</button>
                                                                <button className="btn-action" disabled={(txnPage + 1) * TRANSACTION_PAGE_SIZE >= txnTotal} onClick={() => loadTransactions(txnPage + 1)}>Next</button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </>
                                    )}
                                    {activeFinanceSubTab === 'promo' && adminPermissionFlags.writePromo && (
                                        <div className="admin-controls-grid">
                                            <div className="admin-card">
                                                <h3>Create Promo Code</h3>
                                                {!adminPermissionFlags.writePromo && (
                                                    <div className="admin-permission-warning">
                                                        Your admin role can view promo codes but cannot create or deactivate them.
                                                    </div>
                                                )}
                                                <div className="push-form">
                                                    <div className="form-group">
                                                        <label>Code</label>
                                                        <input className="admin-input" placeholder="e.g. CAMPUS50" value={promoCode} disabled={!adminPermissionFlags.writePromo} onChange={e => setPromoCode(e.target.value.toUpperCase())} />
                                                    </div>
                                                    <div className="form-group">
                                                        <label>Discount % ({promoDiscount}%)</label>
                                                        <input type="range" min="1" max="100" value={promoDiscount} disabled={!adminPermissionFlags.writePromo} onChange={e => setPromoDiscount(e.target.value)} style={{ accentColor: '#38bdf8' }} />
                                                    </div>
                                                    <div className="form-group">
                                                        <label>Max Uses</label>
                                                        <input type="number" className="admin-input" value={promoMaxUses} disabled={!adminPermissionFlags.writePromo} onChange={e => setPromoMaxUses(Number(e.target.value))} />
                                                    </div>
                                                    <button className="btn-blast" disabled={!adminPermissionFlags.writePromo} onClick={createPromoCode}>Create Code</button>
                                                </div>
                                            </div>
                                            <div className="admin-card">
                                                <div className="promo-table-header">
                                                    <div>
                                                        <h3>Promo Campaigns</h3>
                                                        <p className="admin-card-note">Search, review usage, export campaign rows, and open audit trails.</p>
                                                    </div>
                                                    <button className="btn-action primary" disabled={filteredPromoCodes.length === 0} onClick={exportVisiblePromoCodes}>Export visible CSV</button>
                                                </div>
                                                <div className="promo-summary-grid">
                                                    <div>
                                                        <span>Total codes</span>
                                                        <strong>{fmt(promoSummary.total)}</strong>
                                                    </div>
                                                    <div>
                                                        <span>Active</span>
                                                        <strong className="credit">{fmt(promoSummary.active)}</strong>
                                                    </div>
                                                    <div>
                                                        <span>Inactive</span>
                                                        <strong>{fmt(promoSummary.inactive)}</strong>
                                                    </div>
                                                    <div>
                                                        <span>Used up</span>
                                                        <strong className={promoSummary.exhausted > 0 ? 'debit' : ''}>{fmt(promoSummary.exhausted)}</strong>
                                                    </div>
                                                    <div>
                                                        <span>Total usage</span>
                                                        <strong>{fmt(promoSummary.uses)} / {fmt(promoSummary.capacity)}</strong>
                                                    </div>
                                                </div>
                                                <div className="promo-filter-panel">
                                                    <div className="promo-filter-grid">
                                                        <label>
                                                            <span>Search</span>
                                                            <input
                                                                className="admin-input"
                                                                placeholder="Code, ID, discount..."
                                                                value={promoFilters.search}
                                                                onChange={e => updatePromoFilter('search', e.target.value)}
                                                            />
                                                        </label>
                                                        <label>
                                                            <span>Status</span>
                                                            <select className="admin-input" value={promoFilters.status} onChange={e => updatePromoFilter('status', e.target.value)}>
                                                                <option value="">All statuses</option>
                                                                <option value="active">Active</option>
                                                                <option value="inactive">Inactive</option>
                                                                <option value="exhausted">Used up</option>
                                                            </select>
                                                        </label>
                                                        <div className="promo-filter-actions">
                                                            <button className="btn-action" onClick={resetPromoFilters}>Clear</button>
                                                        </div>
                                                    </div>
                                                    <ActiveFilterChips filters={promoFilterChips} />
                                                </div>
                                                <div className="admin-table-container" style={{ marginTop: 0 }}>
                                                    <table className="admin-table">
                                                        <thead><tr><th>Code</th><th>Discount</th><th>Uses</th><th>Status</th><th>Actions</th></tr></thead>
                                                        <tbody>
                                                            {filteredPromoCodes.length === 0 ? (
                                                                <tr>
                                                                    <td colSpan="5">
                                                                        <AdminEmptyState
                                                                            title={promoCodes.length === 0 ? 'No promo codes yet' : 'No promo codes match these filters'}
                                                                            body={promoCodes.length === 0 ? 'Create a code with a clear campaign name before sharing it with students.' : 'Clear the search or status filter to widen the campaign list.'}
                                                                            actionLabel={promoCodes.length === 0 ? undefined : 'Clear filters'}
                                                                            onAction={promoCodes.length === 0 ? undefined : resetPromoFilters}
                                                                        />
                                                                    </td>
                                                                </tr>
                                                            ) : filteredPromoCodes.map(p => (
                                                                <tr key={p.id}>
                                                                    <td>
                                                                        <strong style={{ fontFamily: 'monospace', color: '#38bdf8' }}>{p.code}</strong>
                                                                        <div className="entity-meta-row compact">
                                                                            <button type="button" className="copy-chip" onClick={() => copyToClipboard(p.code, 'Promo code')}>Copy code</button>
                                                                            {p.id && <button type="button" className="copy-chip" onClick={() => copyToClipboard(p.id, 'Promo ID')}>Copy ID</button>}
                                                                        </div>
                                                                    </td>
                                                                    <td>{p.discount_percent}%</td>
                                                                    <td>{p.uses_count}/{p.max_uses}</td>
                                                                    <td><span className={`status-badge ${p.is_active ? 'active' : 'banned'}`}>{p.is_active ? 'Active' : 'Inactive'}</span></td>
                                                                    <td>
                                                                        <div className="table-action-row">
                                                                            <button className="btn-action" onClick={() => setPromoCase(p)}>Details</button>
                                                                            {adminPermissionFlags.readAudit && <button className="btn-action" onClick={() => openAuditTrail(p.id, 'promo_code')}>Audit</button>}
                                                                            {p.is_active && <button className="btn-action btn-ban" disabled={!adminPermissionFlags.writePromo} onClick={() => deactivatePromo(p)}>Deactivate</button>}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* APP CONTROLS */}
                    {activeTab === 'controls' && (adminPermissionFlags.writeConfig || adminPermissionFlags.broadcastPush || adminPermissionFlags.manageAdminAccess) && (
                        <div className="admin-panel animate-fade-in-up">
                            <h2>Global App Controls</h2>
                            <p className="admin-subtitle">Manage features, push notifications, and app settings</p>

                            {loadingConfig ? <div className="admin-loading">Loading config...</div> : (
                                <div className="admin-controls-grid">
                                    {/* Feature Flags */}
                                    {adminPermissionFlags.writeConfig && (
                                        <div className="admin-card">
                                            <h3>Feature Flags</h3>
                                            <div className="config-snapshot-card">
                                                <div>
                                                    <strong>Config snapshot</strong>
                                                    <span>Capture current flags, swipe limit, and banner state before or after risky changes.</span>
                                                </div>
                                                <div className="config-snapshot-actions">
                                                    <button className="btn-action" onClick={copyConfigSnapshot}>Copy JSON</button>
                                                    <button className="btn-action primary" onClick={exportConfigSnapshot}>Export CSV</button>
                                                </div>
                                            </div>
                                            <div className="config-status-grid">
                                                <div className={isConfigOn('maintenance_mode') ? 'danger' : 'ok'}>
                                                    <span>App availability</span>
                                                    <strong>{isConfigOn('maintenance_mode') ? 'Maintenance on' : 'Live'}</strong>
                                                </div>
                                                <div className={isConfigOn('confessions_enabled') ? 'ok' : 'warning'}>
                                                    <span>Confessions</span>
                                                    <strong>{isConfigOn('confessions_enabled') ? 'Enabled' : 'Disabled'}</strong>
                                                </div>
                                                <div className={isConfigOn('premium_swipes_enabled') ? 'ok' : 'warning'}>
                                                    <span>Paid swipes</span>
                                                    <strong>{isConfigOn('premium_swipes_enabled') ? 'Enabled' : 'Disabled'}</strong>
                                                </div>
                                            </div>
                                            <div className="config-list">
                                                {configFlagRows.map(([key, label, desc]) => (
                                                    <div key={key} className={`config-item ${key === 'maintenance_mode' && isConfigOn(key) ? 'danger' : ''}`}>
                                                        <div className="config-info">
                                                            <strong>{label}</strong>
                                                            <p>{desc}</p>
                                                        </div>
                                                        <div className="config-toggle-cluster">
                                                            <span className={`status-badge ${isConfigOn(key) ? 'active' : 'shadow'}`}>{isConfigOn(key) ? 'Active' : 'Off'}</span>
                                                            <label className="toggle-switch">
                                                                <input type="checkbox" checked={isConfigOn(key)} onChange={e => toggleFeatureFlag(key, label, e.target.checked)} />
                                                                <span className="slider" />
                                                            </label>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {adminPermissionFlags.manageAdminAccess && (
                                        <div className="admin-card admin-access-card">
                                            <h3>Admin Access</h3>
                                            <p className="admin-card-note">
                                                Owner-only controls for granting full admin access, assigning restricted permissions, or revoking admin access.
                                            </p>
                                            <div className="admin-access-review-panel">
                                                <div>
                                                    <span>Total admins</span>
                                                    <strong>{fmt(adminAccessList.length)}</strong>
                                                </div>
                                                <div>
                                                    <span>Full access</span>
                                                    <strong className={fullAdminCount > 1 ? 'debit' : ''}>{fmt(fullAdminCount)}</strong>
                                                </div>
                                                <div>
                                                    <span>Restricted</span>
                                                    <strong>{fmt(restrictedAdminCount)}</strong>
                                                </div>
                                                <div className="admin-access-review-actions">
                                                    <button type="button" className="btn-action" onClick={copyAdminAccessSummary}>Copy JSON</button>
                                                    <button type="button" className="btn-action primary" onClick={exportAdminAccessList}>Export CSV</button>
                                                </div>
                                            </div>
                                            <div className="admin-access-form">
                                                <div className="form-group">
                                                    <label>Target User ID</label>
                                                    <input
                                                        className="admin-input"
                                                        placeholder="Paste user UUID from User Management"
                                                        value={adminAccessTargetId}
                                                        onChange={e => setAdminAccessTargetId(e.target.value)}
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label>Access Mode</label>
                                                    <select className="admin-input" value={adminAccessMode} onChange={e => setAdminAccessMode(e.target.value)}>
                                                        <option value="restricted_admin">Restricted admin</option>
                                                        <option value="legacy_admin">Full legacy admin</option>
                                                        <option value="revoke_admin">Revoke admin</option>
                                                    </select>
                                                </div>
                                                {adminAccessMode === 'restricted_admin' && (
                                                    <div className="admin-permission-grid">
                                                        {adminPermissionOptions.map(([permission, label]) => (
                                                            <label key={permission} className="admin-permission-option">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={adminAccessPermissions.includes(permission)}
                                                                    onChange={() => toggleAdminPermission(permission)}
                                                                />
                                                                <span>{label}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                )}
                                                <div className="admin-access-actions">
                                                    <button className="btn-action" onClick={loadAdminAccessList}>Refresh admins</button>
                                                    <button className="btn-action primary" disabled={savingAdminAccess} onClick={updateAdminAccess}>
                                                        {savingAdminAccess ? 'Saving...' : 'Update access'}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="admin-access-list">
                                                {adminAccessList.length === 0 ? (
                                                    <div className="push-history-empty">No admin users loaded.</div>
                                                ) : adminAccessList.map(admin => (
                                                    <div className="admin-access-row" key={admin.user_id}>
                                                        <div>
                                                            <strong>{admin.full_name || admin.email || 'Admin user'}</strong>
                                                            <span>{admin.email || admin.user_id}</span>
                                                            <div className="entity-meta-row compact">
                                                                <code>{admin.user_id}</code>
                                                                <button type="button" className="copy-chip" onClick={() => copyToClipboard(admin.user_id, 'Admin user ID')}>Copy ID</button>
                                                            </div>
                                                        </div>
                                                        <div className="admin-access-row-meta">
                                                            <span className={`admin-access-pill ${admin.permission_mode === 'explicit_permissions' ? 'restricted' : 'full'}`}>
                                                                {String(admin.role || 'admin').replace(/_/g, ' ')}
                                                            </span>
                                                            <div className="admin-permission-chip-row">
                                                                {Array.isArray(admin.permissions) && admin.permissions.length > 0 ? (
                                                                    admin.permissions.map(permission => (
                                                                        <span className="admin-permission-chip" key={`${admin.user_id}-${permission}`}>
                                                                            {permission}
                                                                        </span>
                                                                    ))
                                                                ) : (
                                                                    <span className="admin-permission-chip full">All permissions</span>
                                                                )}
                                                            </div>
                                                            <div className="admin-access-row-actions">
                                                                <button type="button" className="copy-chip" onClick={() => editAdminAccess(admin)}>Edit</button>
                                                                <button type="button" className="copy-chip danger" onClick={() => startAdminRevoke(admin)}>Revoke</button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Swipe Limit & Banner */}
                                    {adminPermissionFlags.writeConfig && (
                                        <div className="admin-card">
                                            <h3>App Settings</h3>
                                            <div className="config-list">
                                                <div className="config-item stacked">
                                                    <div className="config-info"><strong>Free Daily Swipes ({swipeLimit})</strong><p>Swipe limit before paying</p></div>
                                                    <div className="config-inline-control">
                                                        <input type="range" min="1" max="50" value={swipeLimit} onChange={e => setSwipeLimit(Number(e.target.value))} />
                                                        <button className="btn-search" onClick={saveSwipeLimit}>Save</button>
                                                    </div>
                                                </div>
                                                <div className="config-item stacked">
                                                    <div className="config-info"><strong>Announcement Banner</strong><p>Shows on top of the app for all users</p></div>
                                                    <textarea className="admin-input admin-textarea" placeholder="e.g. New feature launched!" value={bannerText} onChange={e => setBannerText(e.target.value)} rows="3" />
                                                    <div className="config-action-row">
                                                        <button className="btn-search" onClick={saveBanner}>{bannerText ? 'Publish Banner' : 'Clear Banner'}</button>
                                                        {appConfig['banner_active'] && <button className="btn-action btn-ban" onClick={removeBanner}>Remove</button>}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Push Notifications */}
                                    {adminPermissionFlags.broadcastPush && <div className="admin-card">
                                        <h3>Push Notification Blast</h3>
                                        <p className="admin-card-note">
                                            Preview targets, send a self-test, then broadcast with a required audit reason.
                                        </p>
                                        <div className="push-form">
                                            <div className="form-group">
                                                <label>Target Segment</label>
                                                <select value={pushSegment} onChange={e => setPushSegment(e.target.value)} className="admin-input">
                                                    <option value="all">All opted-in users</option>
                                                    <option value="active_7d">Active last 7 days</option>
                                                    <option value="inactive_7d">Inactive 7+ days</option>
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label>Title</label>
                                                <input className="admin-input" placeholder="e.g. Happy Sunday Campus!" value={pushTitle} onChange={e => setPushTitle(e.target.value)} />
                                                <small className="admin-field-hint">{pushTitle.trim().length}/80 suggested characters</small>
                                            </div>
                                            <div className="form-group">
                                                <label>Message</label>
                                                <textarea className="admin-input admin-textarea" placeholder="e.g. Check out the new matches waiting for you." value={pushBody} onChange={e => setPushBody(e.target.value)} rows="3" />
                                                <small className="admin-field-hint">{pushBody.trim().length}/180 suggested characters</small>
                                            </div>
                                            <div className="form-group">
                                                <label>Tap Destination</label>
                                                <input
                                                    className="admin-input"
                                                    placeholder="/notifications, /chat?chatId=..., /call/..."
                                                    value={pushUrl}
                                                    onChange={e => setPushUrl(e.target.value)}
                                                />
                                                <small className="admin-field-hint">Use an in-app path for repeatable push tap QA.</small>
                                            </div>
                                            <div className="push-readiness-panel">
                                                <strong>Broadcast readiness</strong>
                                                {pushReadinessItems.map(item => (
                                                    <div className={`push-readiness-item ${item.done ? 'done' : 'pending'}`} key={item.label}>
                                                        <span>{item.done ? 'Ready' : 'Needed'}</span>
                                                        <div>
                                                            <b>{item.label}</b>
                                                            <small>{item.detail}</small>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            {pushPreview && (
                                                <div className="push-preview-panel">
                                                    <div>
                                                        <span>Eligible users</span>
                                                        <strong>{fmt(pushPreview.userCount)}</strong>
                                                    </div>
                                                    <div>
                                                        <span>Device targets</span>
                                                        <strong>{fmt(pushPreview.deviceCount)}</strong>
                                                    </div>
                                                    <div>
                                                        <span>Status</span>
                                                        <strong>{pushPreview.skipped ? 'Skipped' : pushPreview.action || 'preview'}</strong>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="push-action-row">
                                                <button className="btn-action" disabled={isPushing || !adminPermissionFlags.broadcastPush} onClick={previewPushBroadcast}>Preview targets</button>
                                                <button className="btn-action primary" disabled={isPushing || !adminPermissionFlags.broadcastPush || !isPushDraftComplete} onClick={testPushBroadcast}>Test to me</button>
                                                <button className="btn-blast" disabled={isPushing || !adminPermissionFlags.broadcastPush || !isPushDraftComplete || !isPushPreviewCurrent || Number(pushPreview?.deviceCount || 0) <= 0} onClick={sendPushBroadcast}>
                                                    {isPushing ? 'Working...' : 'Send Broadcast'}
                                                </button>
                                            </div>
                                            <div className="push-history-panel">
                                                <div className="push-history-header">
                                                    <strong>Recent broadcast activity</strong>
                                                    <div className="push-history-actions">
                                                        <button className="btn-action" disabled={pushHistory.length === 0} onClick={copyPushHistorySummary}>Copy JSON</button>
                                                        <button className="btn-action primary" disabled={pushHistory.length === 0} onClick={exportPushHistory}>Export CSV</button>
                                                        <button className="btn-action" onClick={loadPushHistory}>Refresh history</button>
                                                    </div>
                                                </div>
                                                {pushHistory.length === 0 ? (
                                                    <div className="push-history-empty">No push broadcasts recorded yet.</div>
                                                ) : (
                                                    <div className="push-history-list">
                                                        {pushHistory.map(item => (
                                                            <div className="push-history-item" key={item.id}>
                                                                <div className="push-history-main">
                                                                    <strong>{item.title}</strong>
                                                                    <span>{item.body}</span>
                                                                    {item.error_message && <span className="push-history-error">{item.error_message}</span>}
                                                                </div>
                                                                <div className="push-history-meta">
                                                                    <span className={`status-badge ${statusClass(item.status)}`}>{item.test_mode ? 'Test' : item.status}</span>
                                                                    <span>{pushSegmentLabels[item.segment] || item.segment}</span>
                                                                    <span>{fmt(item.target_user_count)} users / {fmt(item.target_device_count)} devices</span>
                                                                    <span>{new Date(item.created_at).toLocaleString()}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'audit' && adminPermissionFlags.readAudit && (
                        <div className="admin-panel animate-fade-in-up">
                            <div className="panel-header-row">
                                <div>
                                    <h2>Admin Audit Logs</h2>
                                    <p className="admin-subtitle">Trace sensitive admin actions and the reasons attached to them.</p>
                                </div>
                                <button className="btn-refresh" onClick={() => loadAuditLogs()}>Refresh</button>
                            </div>

                            <div className="audit-filter-panel">
                                <div className="audit-quick-filter-grid">
                                    {auditQuickFilters.map(item => (
                                        <button type="button" key={item.label} onClick={() => applyAuditQuickFilter(item.filters)}>
                                            <strong>{item.label}</strong>
                                            <span>{item.detail}</span>
                                        </button>
                                    ))}
                                </div>
                                <div className="audit-filter-grid">
                                    <label>
                                        <span>Search</span>
                                        <input
                                            className="admin-input"
                                            value={auditFilters.search}
                                            onChange={e => updateAuditFilter('search', e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') applyAuditFilters(); }}
                                            placeholder="Reason, metadata, target id..."
                                        />
                                    </label>
                                    <label>
                                        <span>Admin</span>
                                        <input
                                            className="admin-input"
                                            value={auditFilters.admin}
                                            onChange={e => updateAuditFilter('admin', e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') applyAuditFilters(); }}
                                            placeholder="Email or name"
                                        />
                                    </label>
                                    <label>
                                        <span>Action</span>
                                        <select className="admin-input" value={auditFilters.action} onChange={e => updateAuditFilter('action', e.target.value)}>
                                            <option value="">All actions</option>
                                            <option value="admin_ban_user">Ban user</option>
                                            <option value="admin_unban_user">Unban user</option>
                                            <option value="admin_shadow_user">Shadow-ban user</option>
                                            <option value="admin_unshadow_user">Remove shadow-ban</option>
                                            <option value="admin_verify_user">Verify user</option>
                                            <option value="admin_unverify_user">Remove verification</option>
                                            <option value="admin_view_user_detail">View user detail</option>
                                            <option value="admin_delete_confession">Delete confession</option>
                                            <option value="admin_dismiss_confession_report">Dismiss report</option>
                                            <option value="admin_delete_reported_confession">Delete reported confession</option>
                                            <option value="approve_withdrawal">Approve payout</option>
                                            <option value="reject_withdrawal">Reject payout</option>
                                            <option value="admin_set_app_config">Config update</option>
                                            <option value="admin_create_promo_code">Create promo</option>
                                            <option value="admin_deactivate_promo_code">Deactivate promo</option>
                                            <option value="admin_push_broadcast">Push broadcast</option>
                                            <option value="admin_update_admin_access">Admin access update</option>
                                        </select>
                                    </label>
                                    <label>
                                        <span>Target</span>
                                        <select className="admin-input" value={auditFilters.targetType} onChange={e => updateAuditFilter('targetType', e.target.value)}>
                                            <option value="">All targets</option>
                                            <option value="profile">Profile</option>
                                            <option value="confession">Confession</option>
                                            <option value="confession_report">Report</option>
                                            <option value="withdrawal">Withdrawal</option>
                                            <option value="app_config">App config</option>
                                            <option value="promo_code">Promo code</option>
                                            <option value="push_broadcast">Push broadcast</option>
                                            <option value="admin_access">Admin access</option>
                                            <option value="system">System</option>
                                        </select>
                                    </label>
                                    <label>
                                        <span>From</span>
                                        <input className="admin-input" type="date" value={auditFilters.from} onChange={e => updateAuditFilter('from', e.target.value)} />
                                    </label>
                                    <label>
                                        <span>To</span>
                                        <input className="admin-input" type="date" value={auditFilters.to} onChange={e => updateAuditFilter('to', e.target.value)} />
                                    </label>
                                </div>
                                <div className="audit-filter-actions">
                                    <button className="btn-action" onClick={resetAuditFilters}>Clear</button>
                                    <button className="btn-action primary" onClick={applyAuditFilters}>Apply filters</button>
                                    <button className="btn-action" disabled={auditLogs.length === 0} onClick={copyVisibleAuditLogsSummary}>Copy visible JSON</button>
                                    <button className="btn-action primary" onClick={exportVisibleAuditLogs}>Export visible CSV</button>
                                </div>
                                <ActiveFilterChips filters={auditFilterChips} />
                            </div>

                            {loadingAudit ? <div className="admin-loading">Loading audit logs...</div> : (
                                <div>
                                    <div className="audit-summary-grid">
                                        <div>
                                            <span>Visible logs</span>
                                            <strong>{fmt(visibleAuditSummary.visible)}</strong>
                                        </div>
                                        <div>
                                            <span>Matching total</span>
                                            <strong>{fmt(auditTotal || auditLogs.length)}</strong>
                                        </div>
                                        <div>
                                            <span>Admins</span>
                                            <strong>{fmt(visibleAuditSummary.admins.size)}</strong>
                                        </div>
                                        <div>
                                            <span>Action types</span>
                                            <strong>{fmt(visibleAuditSummary.actions.size)}</strong>
                                        </div>
                                        <div>
                                            <span>Target types</span>
                                            <strong>{fmt(visibleAuditSummary.targets.size)}</strong>
                                        </div>
                                        <div>
                                            <span>Newest</span>
                                            <strong>{visibleAuditSummary.newest ? fmtTime(visibleAuditSummary.newest) : 'None'}</strong>
                                        </div>
                                    </div>
                                    <div className="audit-result-bar">
                                        <span>{fmt(auditTotal || auditLogs.length)} matching logs</span>
                                        <span>Page {auditPage + 1}</span>
                                    </div>
                                    <div className="admin-table-container">
                                        <table className="admin-table audit-table">
                                            <thead>
                                                <tr>
                                                    <th>Time</th>
                                                    <th>Admin</th>
                                                    <th>Action</th>
                                                    <th>Target</th>
                                                    <th>Reason / Metadata</th>
                                                    <th>Tools</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {auditLogs.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="6">
                                                            <div className="admin-empty-state">
                                                                <strong>No audit logs match these filters</strong>
                                                                <span>Try widening the date range, clearing the action filter, or searching by target ID.</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : auditLogs.map(log => (
                                                    <Fragment key={log.id}>
                                                        <tr>
                                                            <td className="audit-time">{new Date(log.created_at).toLocaleString()}</td>
                                                            <td>
                                                                <strong>{log.admin_name || 'Admin'}</strong>
                                                                <div className="user-email">{log.admin_email || log.admin_user_id || 'Unknown admin'}</div>
                                                                {log.admin_user_id && (
                                                                    <div className="entity-meta-row compact">
                                                                        <code className="audit-target-id">{log.admin_user_id}</code>
                                                                        <button type="button" className="copy-chip" onClick={() => copyToClipboard(log.admin_user_id, 'Admin ID')}>Copy</button>
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td><span className="status-badge shadow audit-action">{log.action}</span></td>
                                                            <td>
                                                                <span className="audit-target-type">{log.target_type || 'system'}</span>
                                                                {log.target_id && (
                                                                    <div className="entity-meta-row compact">
                                                                        <code className="audit-target-id">{log.target_id}</code>
                                                                        <button type="button" className="copy-chip" onClick={() => copyToClipboard(log.target_id, 'Target ID')}>Copy</button>
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="audit-meta">{auditMetadataSummary(log.metadata)}</td>
                                                            <td className="audit-tools">
                                                                <button
                                                                    type="button"
                                                                    className="copy-chip accent"
                                                                    onClick={() => setExpandedAuditId(expandedAuditId === log.id ? null : log.id)}
                                                                >
                                                                    {expandedAuditId === log.id ? 'Hide' : 'Details'}
                                                                </button>
                                                                <button type="button" className="copy-chip" onClick={() => copyToClipboard(log.id, 'Audit log ID')}>Copy log ID</button>
                                                                <button type="button" className="copy-chip" onClick={() => copyToClipboard(auditMetadataJson(log.metadata), 'Audit metadata JSON')}>Copy JSON</button>
                                                            </td>
                                                        </tr>
                                                        {expandedAuditId === log.id && (
                                                            <tr key={`${log.id}-details`} className="audit-detail-row">
                                                                <td colSpan="6">
                                                                    <div className="audit-detail-card">
                                                                        <div className="audit-detail-grid">
                                                                            <div>
                                                                                <span>Audit log ID</span>
                                                                                <code>{log.id}</code>
                                                                            </div>
                                                                            <div>
                                                                                <span>Target</span>
                                                                                <code>{log.target_type || 'system'}{log.target_id ? ` / ${log.target_id}` : ''}</code>
                                                                            </div>
                                                                            <div>
                                                                                <span>Admin</span>
                                                                                <code>{log.admin_email || log.admin_user_id || 'Unknown admin'}</code>
                                                                            </div>
                                                                        </div>
                                                                        <pre className="audit-json">{auditMetadataJson(log.metadata)}</pre>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </Fragment>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="audit-pagination">
                                        <button className="btn-action" disabled={auditPage === 0} onClick={() => loadAuditLogs(auditPage - 1)}>Previous</button>
                                        <button className="btn-action" disabled={(auditPage + 1) * AUDIT_PAGE_SIZE >= auditTotal} onClick={() => loadAuditLogs(auditPage + 1)}>Next</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                </main>
            </div>

            {/* User Profile Drawer */}
            {viewUser && (
                <UserDrawer
                    user={viewUser}
                    onClose={() => setViewUser(null)}
                    onCopy={copyToClipboard}
                    onAudit={adminPermissionFlags.readAudit ? openAuditTrail : null}
                    onStatusAction={toggleUserStatus}
                    canModerate={adminPermissionFlags.moderateUsers}
                />
            )}

            {moderationCase && (
                <ModerationCaseDrawer
                    item={moderationCase.item}
                    type={moderationCase.type}
                    onClose={() => setModerationCase(null)}
                    onCopy={copyToClipboard}
                    onAudit={adminPermissionFlags.readAudit ? openAuditTrail : null}
                    onDeleteConfession={handleDeleteConfession}
                    onDismissReport={handleDismissReport}
                    onDeleteReported={handleDeleteReported}
                    canModerate={adminPermissionFlags.moderateContent}
                />
            )}

            {payoutCase && (
                <PayoutCaseDrawer
                    withdrawal={payoutCase}
                    onClose={() => setPayoutCase(null)}
                    onCopy={copyToClipboard}
                    onAudit={adminPermissionFlags.readAudit ? openAuditTrail : null}
                    onReview={reviewWithdrawal}
                    canReview={adminPermissionFlags.reviewPayouts}
                />
            )}

            {transactionCase && (
                <TransactionDetailDrawer
                    transaction={transactionCase}
                    onClose={() => setTransactionCase(null)}
                    onCopy={copyToClipboard}
                    onAudit={adminPermissionFlags.readAudit ? openAuditTrail : null}
                    onOpenUser={user => {
                        setTransactionCase(null);
                        setViewUser(user);
                    }}
                />
            )}

            {promoCase && (
                <PromoDetailDrawer
                    promo={promoCase}
                    onClose={() => setPromoCase(null)}
                    onCopy={copyToClipboard}
                    onAudit={adminPermissionFlags.readAudit ? openAuditTrail : null}
                    onDeactivate={deactivatePromo}
                    canWrite={adminPermissionFlags.writePromo}
                />
            )}

            {adminAction && (
                <AdminActionModal
                    action={adminAction}
                    onCancel={() => closeAdminAction(null)}
                    onConfirm={closeAdminAction}
                />
            )}
            <AdminCommandPalette
                open={commandPaletteOpen}
                query={commandQuery}
                commands={commandPaletteCommands}
                onQueryChange={setCommandQuery}
                onClose={() => {
                    setCommandPaletteOpen(false);
                    setCommandQuery('');
                }}
            />
        </div>
    );
}
