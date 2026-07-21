import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserSettings, updateUserSettings } from '../services/notificationService';
import { verifyAndRestorePremium } from '../services/paymentService';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import AndroidInstallButton from '../components/AndroidInstallButton';
import { partnerWhatsAppUrl, supportWhatsAppUrl, founderLinkedInUrl } from '../config/contactLinks';
import { useCachedAsync } from '../hooks/useCachedAsync';
import { setCachedData } from '../lib/persistentCache';
import { enqueueOfflineOperation, removeOfflineOperation } from '../lib/offlineQueue';
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
    const { currentUser, userProfile, logout, fetchProfile } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const [restoring, setRestoring] = useState(false);
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

    const handleLogout = async () => {
        await logout();
        navigate('/login', { replace: true });
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
                    <div className="settings-item">
                        <div className="item-info">
                            <h3>📧 Email Us</h3>
                            <p>info@thecollegedate.com</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="settings-section">
                <h2 className="section-title">Account</h2>
                <div className="settings-list">
                    <button className="settings-action-btn logout" onClick={handleLogout}>
                        Log Out
                    </button>
                    <button className="settings-action-btn delete">
                        Deactivate Account
                    </button>
                </div>
            </div>

            {saving && <div className="saving-indicator">Saving...</div>}
        </div>
    );
}
