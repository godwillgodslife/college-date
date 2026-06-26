import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserSettings, updateUserSettings } from '../services/notificationService';
import { verifyAndRestorePremium } from '../services/paymentService';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import AndroidInstallButton from '../components/AndroidInstallButton';
import { partnerWhatsAppUrl, supportWhatsAppUrl } from '../config/contactLinks';
import { useCachedAsync } from '../hooks/useCachedAsync';
import { setCachedData } from '../lib/persistentCache';
import './Settings.css';

const DEFAULT_SETTINGS = {
    match_notifications: true,
    view_notifications: true,
    confession_notifications: true,
    email_notifications: true,
    push_notifications: true,
    sound_enabled: true,
    show_online_status: true,
    incognito_mode: false
};

export default function Settings() {
    const { currentUser, userProfile, logout, fetchProfile } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const [restoring, setRestoring] = useState(false);

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

    const handleToggle = async (key) => {
        if (!settings) return;

        const newSettings = { ...settings, [key]: !settings[key] };
        setSettings(newSettings); // Optimistic update
        setCachedData(['settings', currentUser.id], newSettings);

        setSaving(true);
        const { error } = await updateUserSettings(currentUser.id, { [key]: !settings[key] });
        if (error) {
            addToast('Failed to save setting', 'error');
            setSettings(settings); // Revert
        }
        setSaving(false);
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
                    <div className="settings-item">
                        <div className="item-info">
                            <h3>Match Alerts</h3>
                            <p>Get notified when you get a new connection.</p>
                        </div>
                        <label className="switch">
                            <input
                                type="checkbox"
                                checked={settings?.match_notifications}
                                onChange={() => handleToggle('match_notifications')}
                            />
                            <span className="slider round"></span>
                        </label>
                    </div>

                    <div className="settings-item">
                        <div className="item-info">
                            <h3>Email Notifications</h3>
                            <p>Receive weekly digests and account updates.</p>
                        </div>
                        <label className="switch">
                            <input
                                type="checkbox"
                                checked={settings?.email_notifications}
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
                                checked={settings?.push_notifications}
                                onChange={() => handleToggle('push_notifications')}
                            />
                            <span className="slider round"></span>
                        </label>
                    </div>

                    <div className="settings-item">
                        <div className="item-info">
                            <h3>🔊 In-App Sounds</h3>
                            <p>Enable unique synthesized tones for alerts.</p>
                        </div>
                        <label className="switch">
                            <input
                                type="checkbox"
                                checked={settings?.sound_enabled !== false}
                                onChange={() => handleToggle('sound_enabled')}
                            />
                            <span className="slider round"></span>
                        </label>
                    </div>

                    <div className="settings-item">
                        <div className="item-info">
                            <h3>👀 Profile View Alerts</h3>
                            <p>Get notified when someone views your profile.</p>
                        </div>
                        <label className="switch">
                            <input
                                type="checkbox"
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
                                const { data, error } = await verifyAndRestorePremium(currentUser.id);
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
