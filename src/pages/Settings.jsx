import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserSettings, updateUserSettings } from '../services/notificationService';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import AndroidInstallButton from '../components/AndroidInstallButton';
import './Settings.css';

export default function Settings() {
    const { currentUser, userProfile, logout } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (currentUser) {
            loadSettings();
        }
    }, [currentUser]);

    async function loadSettings() {
        setLoading(true);
        const { data, error } = await getUserSettings(currentUser.id);
        if (error) {
            addToast('Failed to load settings', 'error');
            // Provide sensible defaults so the page still renders
            setSettings({
                match_notifications: true,
                email_notifications: true,
                push_notifications: true,
                show_online_status: true,
                incognito_mode: false
            });
        } else {
            // If data is null (no profile row), use defaults
            setSettings(data || {
                match_notifications: true,
                email_notifications: true,
                push_notifications: true,
                show_online_status: true,
                incognito_mode: false
            });
        }
        setLoading(false);
    }

    const handleToggle = async (key) => {
        if (!settings) return;

        const newSettings = { ...settings, [key]: !settings[key] };
        setSettings(newSettings); // Optimistic update

        setSaving(true);
        const { error } = await updateUserSettings(currentUser.id, { [key]: !settings[key] });
        if (error) {
            addToast('Failed to save setting', 'error');
            setSettings(settings); // Revert
        }
        setSaving(false);
    };

    if (loading) return <LoadingSpinner fullScreen text="Loading preferences..." />;

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

            <div className="settings-section">
                <h2 className="section-title">Support</h2>
                <div className="settings-list">
                    <a
                        href="https://wa.me/2349160264415?text=Hi%20👋%20I%20need%20help%20with%20CollegeDate"
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
                    <button className="settings-action-btn logout" onClick={logout}>
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
