import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getUserSettings, updateUserSettings } from '../services/notificationService';
import { verifyAndRestorePremium } from '../services/paymentService';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import AndroidInstallButton from '../components/AndroidInstallButton';
import { partnerWhatsAppUrl, supportWhatsAppUrl, founderLinkedInUrl } from '../config/contactLinks';
import { useCachedAsync } from '../hooks/useCachedAsync';
import { setCachedData } from '../lib/persistentCache';
import { enqueueOfflineOperation, removeOfflineOperation } from '../lib/offlineQueue';
import { isNativePlatform } from '../lib/secureAuthStorage';
import { supabase } from '../lib/supabase';
import { getBlockedUsers, unblockUser } from '../services/blockService';
import { updateFinderOptIn } from '../services/campusFinderService';
import { AppGuideModal, resetAllGuides } from '../components/ContextualGuide';
import OfficialAccountBadge from '../components/OfficialAccountBadge';
import OfficialHubModal from '../components/OfficialHubModal';
import './Settings.css';

const DEFAULT_SETTINGS = {
    match_notifications: true,
    message_notifications: true,
    request_notifications: true,
    profile_activity_notifications: true,
    social_notifications: true,
    view_notifications: true,
    confession_notifications: true,
    email_notifications: true,
    push_notifications: true,
    sound_enabled: true,
    vibration_enabled: true,
    message_previews_enabled: true,
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00',
    quiet_hours_end: '07:00',
    marketing_notifications: true,
    show_online_status: true,
    incognito_mode: false
};

export default function Settings() {
    const {
        currentUser,
        userProfile,
        logout,
        fetchProfile,
        biometricAvailable,
        biometricEnabled,
        biometricLabel,
        setBiometricLoginEnabled
    } = useAuth();
    const { themePreference, setThemePreference, effectiveTheme } = useTheme();
    const { addToast } = useToast();
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const [securitySaving, setSecuritySaving] = useState(false);
    const [restoring, setRestoring] = useState(false);
    const [deactivating, setDeactivating] = useState(false);
    const [showDeactivateModal, setShowDeactivateModal] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showBlockedModal, setShowBlockedModal] = useState(false);
    const [blockedUsers, setBlockedUsers] = useState([]);
    const [loadingBlocked, setLoadingBlocked] = useState(false);
    const [showGuideModal, setShowGuideModal] = useState(false);
    const [showOfficialHub, setShowOfficialHub] = useState(false);

    const handleResetGuides = () => {
        resetAllGuides();
        addToast('All onboarding tips and guides have been reset.', 'success');
    };

    const loadBlockedUsers = async () => {
        setLoadingBlocked(true);
        try {
            const { blocked, error } = await getBlockedUsers();
            if (error) throw error;
            setBlockedUsers(blocked || []);
        } catch (err) {
            console.error('Failed to load blocked users:', err);
            addToast('Could not load blocked users', 'error');
        } finally {
            setLoadingBlocked(false);
        }
    };

    const handleOpenBlockedModal = () => {
        setShowBlockedModal(true);
        loadBlockedUsers();
    };

    const handleUnblockUserAccount = async (blockedUserId, name) => {
        try {
            const { success, error } = await unblockUser(blockedUserId);
            if (!success) throw new Error(error);
            setBlockedUsers(prev => prev.filter(item => item.blocked_id !== blockedUserId && item.blocked_user?.id !== blockedUserId));
            addToast(`Unblocked ${name || 'user'}.`, 'success');
        } catch (err) {
            addToast(err.message || 'Failed to unblock', 'error');
        }
    };

    const showNotificationPreviewTools = import.meta.env.DEV
        || window.Capacitor?.isNativePlatform?.()
        || window.location.hostname === 'localhost'
        || window.location.hostname === '127.0.0.1'
        || window.location.hostname === 'www.thecollegedate.com'
        || window.location.hostname.endsWith('.netlify.app');

    const fetchSettings = useCallback(async () => {
        if (!currentUser) return DEFAULT_SETTINGS;
        const { data, error } = await getUserSettings(currentUser.id);
        if (error) throw error;
        return data || DEFAULT_SETTINGS;
    }, [currentUser]);

    const {
        data: settings = DEFAULT_SETTINGS,
        setData: setSettings,
        loading
    } = useCachedAsync(
        currentUser ? ['settings', currentUser.id] : null,
        fetchSettings,
        {
            enabled: Boolean(currentUser),
            ttlMs: 30 * 60 * 1000,
            initialData: DEFAULT_SETTINGS,
            onError: () => addToast('Failed to load fresh settings. Showing saved preferences.', 'info')
        }
    );

    const saveSettingsChange = async (changes) => {
        if (!settings) return;

        const newSettings = { ...settings, ...changes };
        setSettings(newSettings); // Optimistic update
        setCachedData(['settings', currentUser.id], newSettings);
        window.dispatchEvent(new CustomEvent('tcd:notification-settings-updated', {
            detail: newSettings
        }));

        setSaving(true);
        const operationId = `update_user_settings:${currentUser.id}:${Object.keys(changes).sort().join(',')}`;
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            enqueueOfflineOperation(currentUser.id, {
                id: operationId,
                type: 'update_user_settings',
                payload: { userId: currentUser.id, changes }
            });
            addToast('Saved on this device. We will sync it when you are back online.', 'info');
            setSaving(false);
            return;
        }

        const { error } = await updateUserSettings(currentUser.id, changes);
        if (error) {
            enqueueOfflineOperation(currentUser.id, {
                id: operationId,
                type: 'update_user_settings',
                payload: { userId: currentUser.id, changes },
                lastError: error
            });
            addToast('Saved locally. We will retry syncing this setting.', 'info');
        } else {
            removeOfflineOperation(currentUser.id, operationId);
            if (changes.incognito_mode !== undefined || changes.show_online_status !== undefined) {
                try {
                    const profileUpdates = {};
                    if (changes.incognito_mode !== undefined) profileUpdates.incognito_mode = changes.incognito_mode;
                    if (changes.show_online_status !== undefined && !changes.show_online_status) {
                        profileUpdates.is_online = false;
                    }
                    await supabase.from('profiles').update(profileUpdates).eq('id', currentUser.id);
                    if (fetchProfile) fetchProfile(currentUser.id);
                } catch (e) {
                    console.warn('Profile privacy sync error:', e);
                }
            }
        }
        setSaving(false);
    };

    const handleToggle = async (key) => {
        if (!settings) return;
        await saveSettingsChange({ [key]: !settings[key] });
    };

    const handleValueChange = async (key, value) => {
        if (!settings) return;
        await saveSettingsChange({ [key]: value });
    };

    const handlePreviewNotification = () => {
        addToast('New message', 'info', 6500, {
            variant: 'notification',
            title: settings?.message_previews_enabled === false ? 'New message' : 'Amaka sent a message',
            body: settings?.message_previews_enabled === false
                ? 'Open The College Date to view this message.'
                : 'Are you coming for faculty week tonight?',
            icon: 'M',
            meta: 'Message'
        });
    };

    const handleBiometricToggle = async () => {
        if (!biometricAvailable) {
            addToast('Biometric login is not available on this device.', 'info');
            return;
        }

        setSecuritySaving(true);
        const nextEnabled = !biometricEnabled;
        const { error } = await setBiometricLoginEnabled(nextEnabled);
        setSecuritySaving(false);

        if (error) {
            addToast(error, 'error');
            return;
        }

        addToast(
            nextEnabled
                ? `${biometricLabel} enabled for future app launches.`
                : `${biometricLabel} disabled.`,
            'success'
        );
    };

    const handleCameraDiscoveryToggle = async () => {
        if (!currentUser) return;
        const nextVal = !userProfile?.allow_camera_discovery;
        try {
            const { error } = await updateFinderOptIn(currentUser.id, nextVal);
            if (error) throw new Error(error);
            if (fetchProfile) await fetchProfile(currentUser.id);
            addToast(
                nextVal
                    ? 'Campus Camera Discovery enabled. Students nearby can identify you via optical camera match.'
                    : 'Campus Camera Discovery disabled. Your profile will not appear in camera scans.',
                'success'
            );
        } catch (err) {
            console.error('Failed to update camera discovery setting:', err);
            addToast(err.message || 'Failed to update camera discovery setting.', 'error');
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login', { replace: true });
    };

    const handleDeactivateAccount = async () => {
        setDeactivating(true);
        try {
            const { error } = await supabase.rpc('deactivate_user_account');
            if (error) throw error;
            addToast('Your account has been deactivated. You can sign back in anytime to reactivate.', 'success');
            await logout();
            navigate('/login', { replace: true });
        } catch (err) {
            console.error('Failed to deactivate account:', err);
            addToast(err?.message || 'Failed to deactivate account. Please try again.', 'error');
        } finally {
            setDeactivating(false);
            setShowDeactivateModal(false);
        }
    };

    const handleDeleteAccount = async () => {
        setDeleting(true);
        try {
            const { error } = await supabase.rpc('delete_user_account');
            if (error) throw error;
            addToast('Your account and personal data have been deleted.', 'info');
            await logout();
            navigate('/login', { replace: true });
        } catch (err) {
            console.error('Failed to delete account:', err);
            addToast(err?.message || 'Failed to delete account. Please try again.', 'error');
        } finally {
            setDeleting(false);
            setShowDeleteModal(false);
        }
    };

    const handleUpdatePassword = async (e) => {
        e?.preventDefault();
        if (!newPassword || newPassword.length < 6) {
            addToast('Password must be at least 6 characters.', 'error');
            return;
        }
        if (newPassword !== confirmPassword) {
            addToast('Passwords do not match.', 'error');
            return;
        }
        setPasswordSaving(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            addToast('Password updated successfully! ✅', 'success');
            setNewPassword('');
            setConfirmPassword('');
            setShowPasswordModal(false);
        } catch (err) {
            console.error('Failed to update password:', err);
            addToast(err?.message || 'Failed to update password.', 'error');
        } finally {
            setPasswordSaving(false);
        }
    };

    if (loading && !settings) return <LoadingSpinner fullScreen text="Loading preferences..." />;

    return (
        <div className="settings-page animated fadeIn">
            <div className="settings-header">
                <h1>Settings</h1>
                <p>Manage your account preferences and notifications.</p>
            </div>

            <div className="settings-section">
                <h2 className="section-title">Account</h2>
                <div className="settings-list">
                    <div className="settings-item status-item">
                        <div className="item-info">
                            <h3>Profile Visibility Status</h3>
                            <p>Current reach in discovery</p>
                        </div>
                        <span className={`status-badge ${(userProfile?.completion_score || 0) < 60 ? 'limited' : 'optimised'}`}>
                            {(userProfile?.completion_score || 0) < 60 ? 'Limited' : 'Optimised'}
                        </span>
                    </div>
                    <div className="settings-item feature-link" onClick={() => navigate('/premium')}>
                        <div className="item-info">
                            <h3>👑 Get Premium</h3>
                            <p>Unlock Super Swipes and more visibility.</p>
                        </div>
                        <span className="chevron">›</span>
                    </div>
                    <div className="settings-item feature-link" onClick={() => navigate('/referrals')}>
                        <div className="item-info">
                            <h3>🎁 Referrals</h3>
                            <p>Invite friends and earn rewards.</p>
                        </div>
                        <span className="chevron">›</span>
                    </div>
                    <div className="settings-item feature-link" onClick={() => navigate('/wallet')}>
                        <div className="item-info">
                            <h3>💰 Wallet & Earnings</h3>
                            <p>Funds, withdrawals, and transactions.</p>
                        </div>
                        <span className="chevron">›</span>
                    </div>
                    <AndroidInstallButton />
                </div>
            </div>

            <div className="settings-section">
                <h2 className="section-title">Login & Security</h2>
                <div className="settings-list">
                    <div className="settings-item feature-link" onClick={() => setShowPasswordModal(true)}>
                        <div className="item-info">
                            <h3>🔑 Change Password</h3>
                            <p>Update your account password for enhanced security.</p>
                        </div>
                        <span className="chevron">›</span>
                    </div>

                    {(biometricAvailable || isNativePlatform()) && (
                        <div className="settings-item">
                            <div className="item-info">
                                <h3>{biometricLabel}</h3>
                                <p>
                                    {biometricAvailable
                                        ? 'Use your fingerprint or device biometric to sign in faster.'
                                        : 'Biometrics not enrolled or supported on this device.'}
                                </p>
                            </div>
                            <label className="switch">
                                <input
                                    type="checkbox"
                                    aria-label={`${biometricLabel} login`}
                                    checked={biometricEnabled}
                                    onChange={handleBiometricToggle}
                                    disabled={!biometricAvailable || securitySaving}
                                />
                                <span className="slider round"></span>
                            </label>
                        </div>
                    )}
                </div>
            </div>

            <div className="settings-section">
                <h2 className="section-title">Appearance</h2>
                <div className="settings-list">
                    <div className="settings-item theme-header-item">
                        <div className="item-info">
                            <h3>Theme</h3>
                            <p>Select interface appearance or sync with your device theme.</p>
                        </div>
                    </div>
                    <div className="theme-selector-container">
                        <button
                            type="button"
                            className={`theme-selector-btn ${themePreference === 'system' ? 'active' : ''}`}
                            onClick={() => {
                                setThemePreference('system');
                                addToast('Theme set to System Default', 'info', 2000);
                            }}
                            aria-label="System default theme"
                        >
                            <span className="theme-btn-icon">📱</span>
                            <span className="theme-btn-label">System</span>
                            <span className="theme-btn-badge">{themePreference === 'system' ? `Auto (${effectiveTheme})` : 'OS match'}</span>
                        </button>

                        <button
                            type="button"
                            className={`theme-selector-btn ${themePreference === 'light' ? 'active' : ''}`}
                            onClick={() => {
                                setThemePreference('light');
                                addToast('Light Theme activated ☀️', 'info', 2000);
                            }}
                            aria-label="Light theme"
                        >
                            <span className="theme-btn-icon">☀️</span>
                            <span className="theme-btn-label">Light</span>
                            <span className="theme-btn-badge">Clean</span>
                        </button>

                        <button
                            type="button"
                            className={`theme-selector-btn ${themePreference === 'dark' ? 'active' : ''}`}
                            onClick={() => {
                                setThemePreference('dark');
                                addToast('Dark Theme activated 🌙', 'info', 2000);
                            }}
                            aria-label="Dark theme"
                        >
                            <span className="theme-btn-icon">🌙</span>
                            <span className="theme-btn-label">Dark</span>
                            <span className="theme-btn-badge">Low light</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="settings-section">
                <h2 className="section-title">Notifications</h2>
                <div className="settings-list">
                    <div className="settings-subsection-label">Alert Types</div>

                    <div className="settings-item">
                        <div className="item-info">
                            <h3>Message Alerts</h3>
                            <p>Get notified when someone sends you a chat message.</p>
                        </div>
                        <label className="switch">
                            <input
                                type="checkbox"
                                aria-label="Message Alerts"
                                checked={settings?.message_notifications !== false}
                                onChange={() => handleToggle('message_notifications')}
                            />
                            <span className="slider round"></span>
                        </label>
                    </div>

                    <div className="settings-item">
                        <div className="item-info">
                            <h3>Request Alerts</h3>
                            <p>Get notified for message and connection requests.</p>
                        </div>
                        <label className="switch">
                            <input
                                type="checkbox"
                                aria-label="Request Alerts"
                                checked={settings?.request_notifications !== false}
                                onChange={() => handleToggle('request_notifications')}
                            />
                            <span className="slider round"></span>
                        </label>
                    </div>

                    <div className="settings-item">
                        <div className="item-info">
                            <h3>Match Alerts</h3>
                            <p>Get notified when you get a new connection.</p>
                        </div>
                        <label className="switch">
                            <input
                                type="checkbox"
                                aria-label="Match Alerts"
                                checked={settings?.match_notifications !== false}
                                onChange={() => handleToggle('match_notifications')}
                            />
                            <span className="slider round"></span>
                        </label>
                    </div>

                    <div className="settings-item">
                        <div className="item-info">
                            <h3>Profile Activity</h3>
                            <p>Get notified when people interact with your profile.</p>
                        </div>
                        <label className="switch">
                            <input
                                type="checkbox"
                                aria-label="Profile Activity"
                                checked={settings?.profile_activity_notifications !== false}
                                onChange={() => handleToggle('profile_activity_notifications')}
                            />
                            <span className="slider round"></span>
                        </label>
                    </div>

                    <div className="settings-item">
                        <div className="item-info">
                            <h3>Social Activity</h3>
                            <p>Get notified for confessions and campus reactions.</p>
                        </div>
                        <label className="switch">
                            <input
                                type="checkbox"
                                aria-label="Social Activity"
                                checked={settings?.social_notifications !== false}
                                onChange={() => handleToggle('social_notifications')}
                            />
                            <span className="slider round"></span>
                        </label>
                    </div>

                    <div className="settings-subsection-label">Delivery</div>

                    <div className="settings-item">
                        <div className="item-info">
                            <h3>Email Notifications</h3>
                            <p>Receive weekly digests and account updates.</p>
                        </div>
                        <label className="switch">
                            <input
                                type="checkbox"
                                aria-label="Email Notifications"
                                checked={settings?.email_notifications !== false}
                                onChange={() => handleToggle('email_notifications')}
                            />
                            <span className="slider round"></span>
                        </label>
                    </div>

                    <div className="settings-item">
                        <div className="item-info">
                            <h3>Push Notifications</h3>
                            <p>Get instant alerts on your device.</p>
                        </div>
                        <label className="switch">
                            <input
                                type="checkbox"
                                aria-label="Push Notifications"
                                checked={settings?.push_notifications !== false}
                                onChange={() => handleToggle('push_notifications')}
                            />
                            <span className="slider round"></span>
                        </label>
                    </div>

                    <div className="settings-subsection-label">In-App Behavior</div>

                    <div className="settings-item">
                        <div className="item-info">
                            <h3>🔊 In-App Sounds</h3>
                            <p>Enable unique synthesized tones for alerts.</p>
                        </div>
                        <label className="switch">
                            <input
                                type="checkbox"
                                aria-label="In-App Sounds"
                                checked={settings?.sound_enabled !== false}
                                onChange={() => handleToggle('sound_enabled')}
                            />
                            <span className="slider round"></span>
                        </label>
                    </div>

                    <div className="settings-item">
                        <div className="item-info">
                            <h3>Vibration</h3>
                            <p>Use light haptic feedback for new foreground alerts.</p>
                        </div>
                        <label className="switch">
                            <input
                                type="checkbox"
                                aria-label="Vibration"
                                checked={settings?.vibration_enabled !== false}
                                onChange={() => handleToggle('vibration_enabled')}
                            />
                            <span className="slider round"></span>
                        </label>
                    </div>

                    <div className="settings-item">
                        <div className="item-info">
                            <h3>Message Previews</h3>
                            <p>Show message text in push and email alerts.</p>
                        </div>
                        <label className="switch">
                            <input
                                type="checkbox"
                                aria-label="Message Previews"
                                checked={settings?.message_previews_enabled !== false}
                                onChange={() => handleToggle('message_previews_enabled')}
                            />
                            <span className="slider round"></span>
                        </label>
                    </div>

                    <div className="settings-item">
                        <div className="item-info">
                            <h3>Quiet Hours</h3>
                            <p>Pause sounds, vibration, and popup alerts at night.</p>
                        </div>
                        <label className="switch">
                            <input
                                type="checkbox"
                                aria-label="Quiet Hours"
                                checked={settings?.quiet_hours_enabled === true}
                                onChange={() => handleToggle('quiet_hours_enabled')}
                            />
                            <span className="slider round"></span>
                        </label>
                    </div>

                    {settings?.quiet_hours_enabled && (
                        <div className="settings-item quiet-hours-item">
                            <div className="item-info">
                                <h3>Quiet Hours Window</h3>
                                <p>Choose when alerts should stay silent.</p>
                            </div>
                            <div className="quiet-hours-inputs">
                                <input
                                    className="time-input"
                                    type="time"
                                    value={settings?.quiet_hours_start || '22:00'}
                                    onChange={(event) => handleValueChange('quiet_hours_start', event.target.value)}
                                    aria-label="Quiet hours start"
                                />
                                <span>to</span>
                                <input
                                    className="time-input"
                                    type="time"
                                    value={settings?.quiet_hours_end || '07:00'}
                                    onChange={(event) => handleValueChange('quiet_hours_end', event.target.value)}
                                    aria-label="Quiet hours end"
                                />
                            </div>
                        </div>
                    )}

                    {showNotificationPreviewTools && (
                        <div className="settings-item notification-preview-item">
                            <div className="item-info">
                                <h3>Notification QA Lab</h3>
                                <p>Preview alerts and inspect this device's push readiness.</p>
                            </div>
                            <div className="notification-preview-actions">
                                <button
                                    type="button"
                                    className="preview-notification-btn"
                                    onClick={handlePreviewNotification}
                                >
                                    Preview
                                </button>
                                <button
                                    type="button"
                                    className="preview-notification-btn secondary"
                                    onClick={() => navigate('/notification-preview')}
                                >
                                    Open lab
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="settings-subsection-label">Specific Activity</div>

                    <div className="settings-item">
                        <div className="item-info">
                            <h3>👀 Profile View Alerts</h3>
                            <p>Get notified when someone views your profile.</p>
                        </div>
                        <label className="switch">
                            <input
                                type="checkbox"
                                aria-label="Profile View Alerts"
                                checked={settings?.view_notifications !== false}
                                onChange={() => handleToggle('view_notifications')}
                            />
                            <span className="slider round"></span>
                        </label>
                    </div>

                    <div className="settings-item">
                        <div className="item-info">
                            <h3>💬 Confession Alerts</h3>
                            <p>Get notified when people react to your confessions.</p>
                        </div>
                        <label className="switch">
                            <input
                                type="checkbox"
                                aria-label="Confession Alerts"
                                checked={settings?.confession_notifications !== false}
                                onChange={() => handleToggle('confession_notifications')}
                            />
                            <span className="slider round"></span>
                        </label>
                    </div>
                </div>
            </div>

            <div className="settings-section">
                <h2 className="section-title">Privacy</h2>
                <div className="settings-list">
                    <div className="settings-item">
                        <div className="item-info">
                            <h3>Show Online Status</h3>
                            <p>Let others see when you are active.</p>
                        </div>
                        <label className="switch">
                            <input
                                type="checkbox"
                                aria-label="Show Online Status"
                                checked={settings?.show_online_status}
                                onChange={() => handleToggle('show_online_status')}
                            />
                            <span className="slider round"></span>
                        </label>
                    </div>

                    <div className="settings-item">
                        <div className="item-info">
                            <h3>Incognito Mode</h3>
                            <p>Hide your profile from Discovery temporarily.</p>
                        </div>
                        <label className="switch">
                            <input
                                type="checkbox"
                                aria-label="Incognito Mode"
                                checked={settings?.incognito_mode}
                                onChange={() => handleToggle('incognito_mode')}
                            />
                            <span className="slider round"></span>
                        </label>
                    </div>

                    <div className="settings-item">
                        <div className="item-info">
                            <h3>📸 Campus Camera Discovery</h3>
                            <p>Allow students on your campus to identify your profile via optical camera match (NDPA protected).</p>
                        </div>
                        <label className="switch">
                            <input
                                type="checkbox"
                                aria-label="Campus Camera Discovery"
                                checked={Boolean(userProfile?.allow_camera_discovery)}
                                onChange={handleCameraDiscoveryToggle}
                            />
                            <span className="slider round"></span>
                        </label>
                    </div>

                    <div className="settings-item feature-link" onClick={handleOpenBlockedModal} style={{ cursor: 'pointer' }}>
                        <div className="item-info">
                            <h3>🚫 Blocked Accounts</h3>
                            <p>Manage users you have blocked from messaging and discovery.</p>
                        </div>
                        <span className="chevron">›</span>
                    </div>
                </div>
            </div>

            {/* Subscription & Restore Purchase Section */}
            <div className="settings-section">
                <h2 className="section-title">Subscription</h2>
                <div className="settings-list">
                    <div className="settings-item status-item">
                        <div className="item-info">
                            <h3>Premium Status</h3>
                            <p>{userProfile?.is_premium ? '👑 Active Premium Member' : 'Free Account'}</p>
                        </div>
                        <span className={`status-badge ${userProfile?.is_premium ? 'optimised' : 'limited'}`}>
                            {userProfile?.is_premium ? 'Premium' : 'Free'}
                        </span>
                    </div>
                    <div className="settings-item">
                        <div className="item-info">
                            <h3>🔄 Restore Purchase</h3>
                            <p>Paid but Premium not activated? Tap to re-verify your Paystack transaction.</p>
                        </div>
                        <button
                            className="restore-btn"
                            disabled={restoring}
                            onClick={async () => {
                                setRestoring(true);
                                const { data, error } = await verifyAndRestorePremium();
                                setRestoring(false);
                                if (error) {
                                    addToast('Verification failed. Contact support if this persists.', 'error');
                                } else if (data?.restored) {
                                    addToast('Premium restored successfully! ✅', 'success');
                                    fetchProfile(currentUser.id);
                                } else {
                                    addToast(data?.message || 'No confirmed subscription found.', 'info');
                                }
                            }}
                        >
                            {restoring ? '⏳' : '🔄'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="settings-section">
                <h2 className="section-title">App Guidance & Help</h2>
                <div className="settings-list">
                    <div className="settings-item feature-link official-hub-item" onClick={() => setShowOfficialHub(true)}>
                        <div className="item-info">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <h3 style={{ margin: 0 }}>Official The College Date</h3>
                                <OfficialAccountBadge size="small" />
                            </div>
                            <p>Video tutorials & official product guides on matching, swiping, chat & earnings.</p>
                        </div>
                        <span className="chevron">›</span>
                    </div>
                    <div className="settings-item feature-link" onClick={() => setShowGuideModal(true)}>
                        <div className="item-info">
                            <h3>📖 How College Date Works (App Guide)</h3>
                            <p>Interactive guide explaining Swiping, Admirers, Chat, Calls & Premium.</p>
                        </div>
                        <span className="chevron">›</span>
                    </div>
                    <div className="settings-item feature-link" onClick={handleResetGuides}>
                        <div className="item-info">
                            <h3>🔄 Reset Guidance Tips</h3>
                            <p>Show all first-time feature guidance and onboarding tips again.</p>
                        </div>
                        <span className="chevron">›</span>
                    </div>
                </div>
            </div>

            <div className="settings-section">
                <h2 className="section-title">Support</h2>
                <div className="settings-list">
                    <a
                        href={supportWhatsAppUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="settings-item feature-link support-link"
                    >
                        <div className="item-info">
                            <h3>💬 Contact Support</h3>
                            <p>Chat with us on WhatsApp for fast help.</p>
                        </div>
                        <span className="chevron">›</span>
                    </a>
                    <a
                        href={partnerWhatsAppUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="settings-item feature-link support-link partner-link"
                    >
                        <div className="item-info">
                            <h3>Become a Partner</h3>
                            <p>Support, invest, or collaborate with The College Date.</p>
                        </div>
                        <span className="partner-chip">WhatsApp</span>
                    </a>
                    <a
                        href={founderLinkedInUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="settings-item feature-link support-link"
                    >
                        <div className="item-info">
                            <h3>🔗 Meet the Founder</h3>
                            <p>Connect with Godswill Godlife Onah on LinkedIn.</p>
                        </div>
                        <span className="partner-chip">LinkedIn</span>
                    </a>
                    <a
                        href="mailto:info@thecollegedate.com"
                        className="settings-item feature-link support-link"
                    >
                        <div className="item-info">
                            <h3>📧 Email Us</h3>
                            <p>info@thecollegedate.com</p>
                        </div>
                        <span className="partner-chip">Email</span>
                    </a>
                    <div className="settings-item feature-link" onClick={() => navigate('/safety')}>
                        <div className="item-info">
                            <h3>🛡️ Safety & Guidelines</h3>
                            <p>Campus dating tips and student harassment prevention.</p>
                        </div>
                        <span className="chevron">›</span>
                    </div>
                </div>
            </div>

            <div className="settings-section">
                <h2 className="section-title">Legal & Policies</h2>
                <div className="settings-list">
                    <div className="settings-item status-item">
                        <div className="item-info">
                            <h3>Terms & Privacy Agreement</h3>
                            <p>Authoritative campus user agreement & compliance</p>
                        </div>
                        <span className="status-badge optimised">
                            v2.0 • Up to date
                        </span>
                    </div>

                    <div className="settings-item feature-link" onClick={() => navigate('/terms')}>
                        <div className="item-info">
                            <h3>📜 Terms of Service</h3>
                            <p>Eligibility, student conduct, virtual coins & escrow terms.</p>
                        </div>
                        <span className="chevron">›</span>
                    </div>

                    <div className="settings-item feature-link" onClick={() => navigate('/privacy')}>
                        <div className="item-info">
                            <h3>🔒 Privacy Policy</h3>
                            <p>NDPA 2023 rights, location, biometric safeguards & data retention.</p>
                        </div>
                        <span className="chevron">›</span>
                    </div>

                    <div className="settings-item feature-link" onClick={() => navigate('/child-safety-standards')}>
                        <div className="item-info">
                            <h3>🛡️ Child Safety Standards</h3>
                            <p>CSAE/CSAM prevention and safety enforcement practices.</p>
                        </div>
                        <span className="chevron">›</span>
                    </div>

                    <div className="settings-item feature-link" onClick={() => navigate('/campus-confessions-guide')}>
                        <div className="item-info">
                            <h3>💡 Campus Confessions Guide</h3>
                            <p>Anonymous posting ethics, meme etiquette & anti-defamation rules.</p>
                        </div>
                        <span className="chevron">›</span>
                    </div>
                </div>
            </div>

            <div className="settings-section">
                <h2 className="section-title">Account Actions</h2>
                <div className="settings-list">
                    <button className="settings-action-btn logout" onClick={handleLogout}>
                        Log Out
                    </button>
                    <button className="settings-action-btn deactivate" onClick={() => setShowDeactivateModal(true)}>
                        Deactivate Account
                    </button>
                    <button className="settings-action-btn delete" onClick={() => setShowDeleteModal(true)}>
                        Delete Account Permanently
                    </button>
                </div>
            </div>

            {/* Deactivate Account Modal */}
            {showDeactivateModal && (
                <div className="settings-modal-overlay" onClick={() => !deactivating && setShowDeactivateModal(false)}>
                    <div className="settings-modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="settings-modal-icon">⏸️</div>
                        <h3>Deactivate Account?</h3>
                        <p>Your profile will be hidden from discovery and you will be logged out. You can reactivate anytime simply by logging back in.</p>
                        <div className="settings-modal-actions">
                            <button
                                type="button"
                                className="modal-btn cancel"
                                disabled={deactivating}
                                onClick={() => setShowDeactivateModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="modal-btn confirm-deactivate"
                                disabled={deactivating}
                                onClick={handleDeactivateAccount}
                            >
                                {deactivating ? 'Deactivating...' : 'Yes, Deactivate'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Account Modal */}
            {showDeleteModal && (
                <div className="settings-modal-overlay" onClick={() => !deleting && setShowDeleteModal(false)}>
                    <div className="settings-modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="settings-modal-icon warning">⚠️</div>
                        <h3>Delete Account Permanently?</h3>
                        <p>This action is permanent and cannot be undone. All your profile data, photos, and match requests will be erased.</p>
                        <div className="settings-modal-actions">
                            <button
                                type="button"
                                className="modal-btn cancel"
                                disabled={deleting}
                                onClick={() => setShowDeleteModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="modal-btn confirm-delete"
                                disabled={deleting}
                                onClick={handleDeleteAccount}
                            >
                                {deleting ? 'Deleting...' : 'Delete Forever'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Change Password Modal */}
            {showPasswordModal && (
                <div className="settings-modal-overlay" onClick={() => !passwordSaving && setShowPasswordModal(false)}>
                    <div className="settings-modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="settings-modal-icon">🔑</div>
                        <h3>Change Password</h3>
                        <p>Enter your new password below (at least 6 characters).</p>
                        <form onSubmit={handleUpdatePassword} className="settings-password-form">
                            <div className="password-input-group">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="New Password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    className="settings-modal-input"
                                />
                                <button
                                    type="button"
                                    className="toggle-pw-btn"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? '👁️' : '🙈'}
                                </button>
                            </div>
                            <div className="password-input-group">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Confirm New Password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    className="settings-modal-input"
                                />
                            </div>
                            <div className="settings-modal-actions">
                                <button
                                    type="button"
                                    className="modal-btn cancel"
                                    disabled={passwordSaving}
                                    onClick={() => setShowPasswordModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="modal-btn confirm-save"
                                    disabled={passwordSaving}
                                >
                                    {passwordSaving ? 'Updating...' : 'Save New Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showBlockedModal && (
                <div className="settings-modal-overlay animate-fade-in" onClick={() => setShowBlockedModal(false)}>
                    <div className="settings-modal-card blocked-accounts-modal glass" onClick={e => e.stopPropagation()}>
                        <div className="settings-modal-header">
                            <div className="modal-title-row">
                                <span className="modal-icon-badge">🚫</span>
                                <div>
                                    <h3>Blocked Accounts</h3>
                                    <p className="modal-subtext">These users cannot message you or view your profile</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                className="settings-modal-close"
                                onClick={() => setShowBlockedModal(false)}
                            >
                                &times;
                            </button>
                        </div>

                        <div className="blocked-list-container">
                            {loadingBlocked ? (
                                <div className="blocked-loading">Loading blocked accounts...</div>
                            ) : blockedUsers.length === 0 ? (
                                <div className="blocked-empty">
                                    <span className="empty-icon">🛡️</span>
                                    <p>No blocked accounts</p>
                                    <span>Anyone you block in chat will appear here.</span>
                                </div>
                            ) : (
                                <div className="blocked-items-list">
                                    {blockedUsers.map(item => {
                                        const user = item.blocked_user || {};
                                        return (
                                            <div key={item.id} className="blocked-user-row">
                                                <img
                                                    src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.blocked_id}`}
                                                    alt=""
                                                    className="blocked-user-avatar"
                                                />
                                                <div className="blocked-user-info">
                                                    <strong>{user.full_name || 'User'}</strong>
                                                    <span>Blocked on {new Date(item.created_at).toLocaleDateString()}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="btn-unblock-settings"
                                                    onClick={() => handleUnblockUserAccount(item.blocked_id, user.full_name)}
                                                >
                                                    Unblock
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <AppGuideModal
                isOpen={showGuideModal}
                onClose={() => setShowGuideModal(false)}
            />

            <OfficialHubModal
                isOpen={showOfficialHub}
                onClose={() => setShowOfficialHub(false)}
            />

            {saving && <div className="saving-indicator">Saving...</div>}
        </div>
    );
}
