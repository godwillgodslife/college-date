import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getPushDebugState } from '../services/pushNotification';
import { normalizeNotificationRoute, openNotificationRoute } from '../utils/notificationRouting';
import './NotificationPreviewLab.css';

const CHROME_SITE_SETTINGS_URL = 'chrome://settings/content/siteDetails?site=https%3A%2F%2Fwww.thecollegedate.com';
const DEFAULT_ROUTE_TEST = '/chat?chatId=push-preview';

function isLocalPreviewAllowed() {
    return import.meta.env.DEV
        || window.location.hostname === 'localhost'
        || window.location.hostname === '127.0.0.1'
        || window.location.hostname === 'www.thecollegedate.com'
        || window.location.hostname.endsWith('.netlify.app');
}

export default function NotificationPreviewLab() {
    const { addToast } = useToast();
    const { currentUser } = useAuth();
    const [browserStatus, setBrowserStatus] = useState('');
    const [readiness, setReadiness] = useState(null);
    const [deviceState, setDeviceState] = useState(null);
    const [deviceRows, setDeviceRows] = useState([]);
    const [deviceRegistryStatus, setDeviceRegistryStatus] = useState('Not checked');
    const [routeInput, setRouteInput] = useState(DEFAULT_ROUTE_TEST);
    const [routeStatus, setRouteStatus] = useState('');
    const [copied, setCopied] = useState(false);
    const [settingsCopied, setSettingsCopied] = useState(false);
    const previewAllowed = isLocalPreviewAllowed();
    const notificationPermission = readiness?.permission || (
        typeof window === 'undefined' || !('Notification' in window)
            ? 'unsupported'
            : window.Notification.permission
    );
    const nextAction = useMemo(() => getNextAction(readiness), [readiness]);

    useEffect(() => {
        if (!previewAllowed) return;

        const collectReadiness = async () => {
            const isNative = Boolean(window.Capacitor?.isNativePlatform?.());
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const pushState = await getPushDebugState();
            const serviceWorkerReady = 'serviceWorker' in navigator
                ? Boolean(await navigator.serviceWorker.getRegistration().catch(() => null))
                : false;
            const [oneSignalWorkerReady, oneSignalUpdaterReady] = await Promise.all([
                fetch('/OneSignalSDKWorker.js', { cache: 'no-store' }).then((res) => res.ok).catch(() => false),
                fetch('/OneSignalSDKUpdaterWorker.js', { cache: 'no-store' }).then((res) => res.ok).catch(() => false)
            ]);

            setReadiness({
                secureContext: window.isSecureContext,
                browserNotificationApi: 'Notification' in window,
                permission: 'Notification' in window ? window.Notification.permission : 'unsupported',
                serviceWorkerReady,
                oneSignalWorkerReady,
                oneSignalUpdaterReady,
                oneSignalLoaded: Boolean(window.OneSignal || window.OneSignalDeferred),
                nativeShell: isNative,
                localPreview: isLocal,
                online: navigator.onLine,
                visibilityState: document.visibilityState,
                focused: document.hasFocus(),
                capacitorPlatform: window.Capacitor?.getPlatform?.() || 'web',
                nativePushEnabled: pushState.nativePushEnabled,
                oneSignalAppIdPresent: pushState.oneSignalAppIdPresent,
                pushSubscriptionReady: Boolean(pushState.subscriptionId),
                lastOpenedRoute: pushState.lastOpenedRoute
            });
            setDeviceState(pushState);
        };

        collectReadiness();

        const refresh = () => collectReadiness();
        window.addEventListener('focus', refresh);
        window.addEventListener('online', refresh);
        window.addEventListener('offline', refresh);
        window.addEventListener('visibilitychange', refresh);
        window.addEventListener('tcd:push-debug-state', refresh);
        window.addEventListener('tcd:notification-route-opened', refresh);

        return () => {
            window.removeEventListener('focus', refresh);
            window.removeEventListener('online', refresh);
            window.removeEventListener('offline', refresh);
            window.removeEventListener('visibilitychange', refresh);
            window.removeEventListener('tcd:push-debug-state', refresh);
            window.removeEventListener('tcd:notification-route-opened', refresh);
        };
    }, [browserStatus, previewAllowed]);

    useEffect(() => {
        if (!previewAllowed || !currentUser?.id) {
            setDeviceRows([]);
            setDeviceRegistryStatus(currentUser?.id ? 'Not checked' : 'Sign in to inspect saved device rows.');
            return;
        }

        let cancelled = false;
        const loadDeviceRows = async () => {
            const { data, error } = await supabase
                .from('user_notification_devices')
                .select('platform, device_id, onesignal_subscription_id, permission_status, revoked_at, updated_at, last_seen_at')
                .eq('user_id', currentUser.id)
                .order('updated_at', { ascending: false })
                .limit(5);

            if (cancelled) return;

            if (error) {
                setDeviceRows([]);
                setDeviceRegistryStatus(`Device registry read failed: ${error.message}`);
                return;
            }

            setDeviceRows(data || []);
            setDeviceRegistryStatus((data || []).length
                ? `${data.length} saved device row${data.length === 1 ? '' : 's'} found.`
                : 'No saved push device rows for this account yet.');
        };

        loadDeviceRows();
        return () => {
            cancelled = true;
        };
    }, [currentUser?.id, previewAllowed]);

    if (!previewAllowed) {
        return <Navigate to="/" replace />;
    }

    const showPreview = ({ hidden = false, category = 'Message' } = {}) => {
        addToast(hidden ? 'New message' : 'Amaka sent a message', 'info', 6500, {
            variant: 'notification',
            title: hidden ? 'New message' : 'Amaka sent a message',
            body: hidden
                ? 'Open The College Date to view this message.'
                : 'Are you coming for faculty week tonight?',
            icon: category === 'Match' ? 'CD' : 'M',
            meta: category
        });
    };

    const showBrowserNotification = async () => {
        if (!('Notification' in window)) {
            setBrowserStatus('This browser does not support local OS notifications.');
            return;
        }

        let permission = window.Notification.permission;
        if (permission === 'default') {
            permission = await window.Notification.requestPermission();
        }

        if (permission !== 'granted') {
            setBrowserStatus(
                permission === 'denied'
                    ? 'Notifications are blocked in browser settings, so this page cannot show the Allow prompt.'
                    : 'Notification permission is not granted in this browser.'
            );
            return;
        }

        const notification = new window.Notification('Amaka sent a message', {
            body: 'Are you coming for faculty week tonight?',
            icon: '/logo-192.png',
            badge: '/logo-192.png',
            tag: 'college-date-local-preview',
            data: { url: routeInput || DEFAULT_ROUTE_TEST }
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
            const opened = openNotificationRoute(notification.data?.url || DEFAULT_ROUTE_TEST);
            setRouteStatus(`Opened ${opened}`);
        };

        setBrowserStatus('Browser notification sent. Check your system notification area.');
    };

    const runRoutePreview = () => {
        const normalized = normalizeNotificationRoute(routeInput || DEFAULT_ROUTE_TEST);
        const opened = openNotificationRoute(normalized);
        setRouteInput(normalized);
        setRouteStatus(`Opened ${opened}`);
    };

    const copyBrowserSettingsUrl = async () => {
        try {
            await navigator.clipboard.writeText(CHROME_SITE_SETTINGS_URL);
            setSettingsCopied(true);
            setTimeout(() => setSettingsCopied(false), 1800);
        } catch {
            setBrowserStatus(`Open Chrome site settings manually and search for ${window.location.hostname}.`);
        }
    };

    const copyAndroidChecklist = async () => {
        const checklist = [
            'The College Date Android notification test',
            '',
            '1. Install the latest local Android build on a physical Android phone.',
            '2. Log into Account B on the Android phone.',
            '3. Open Android system settings and confirm notifications are allowed for The College Date.',
            '4. Open The College Date once and confirm the app reaches the main dashboard.',
            '5. Put the app in the background or lock the phone.',
            '6. From Account A, send Account B a real chat message.',
            '7. Confirm Account B receives a phone notification.',
            '8. Tap the notification and confirm it opens the correct chat.',
            '9. Turn Message Previews off in Settings and repeat the message test.',
            '10. Confirm the phone notification hides the message text.',
            '',
            'Deep-link probe:',
            `- Open ${window.location.origin}${normalizeNotificationRoute(routeInput || DEFAULT_ROUTE_TEST)} in Android and confirm it lands inside the app.`,
            '- Return to /notification-preview and confirm Last opened route changed after tapping the push.'
        ].join('\n');

        try {
            await navigator.clipboard.writeText(checklist);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch {
            setCopied(false);
            setBrowserStatus('Clipboard copy failed. You can still follow the checklist on this page.');
        }
    };

    return (
        <main className="notification-preview-lab">
            <section className="preview-lab-panel">
                <div>
                    <p className="preview-lab-kicker">Local QA</p>
                    <h1>Notification Preview</h1>
                    <p>
                        Test the in-app notification card that appears while someone is actively using The College Date.
                    </p>
                </div>

                <div className="preview-lab-actions">
                    <button type="button" onClick={() => showPreview()}>
                        Message preview
                    </button>
                    <button type="button" onClick={() => showPreview({ hidden: true })}>
                        Hidden preview
                    </button>
                    <button type="button" onClick={() => showPreview({ category: 'Match' })}>
                        Match alert
                    </button>
                </div>

                <div className="preview-lab-system">
                    <div>
                        <h2>Outside-app test</h2>
                        <p>
                            This uses the browser notification API as a local stand-in for the real OneSignal/Firebase push path.
                        </p>
                    </div>
                    <button type="button" onClick={showBrowserNotification}>
                        Try browser notification
                    </button>
                    <div className="preview-lab-status">
                        Permission: <strong>{notificationPermission}</strong>
                        {browserStatus && <span>{browserStatus}</span>}
                    </div>
                </div>

                <div className="preview-readiness">
                    <h2>Readiness checklist</h2>
                    <ul>
                        <ReadinessItem
                            label="Secure notification context"
                            ok={readiness?.secureContext}
                            note="Required by browsers before notification APIs can work."
                        />
                        <ReadinessItem
                            label="Browser notification API"
                            ok={readiness?.browserNotificationApi}
                            note="Needed for local browser notification preview."
                        />
                        <ReadinessItem
                            label="Permission is granted"
                            ok={readiness?.permission === 'granted'}
                            note={`Current permission: ${readiness?.permission || 'checking'}.`}
                        />
                        <ReadinessItem
                            label="Service worker registered"
                            ok={readiness?.serviceWorkerReady}
                            note={readiness?.localPreview ? 'Usually disabled on localhost dev builds.' : 'Needed for production web push.'}
                        />
                        <ReadinessItem
                            label="OneSignal worker file"
                            ok={readiness?.oneSignalWorkerReady}
                            note="Required at /OneSignalSDKWorker.js for production web push."
                        />
                        <ReadinessItem
                            label="OneSignal updater worker file"
                            ok={readiness?.oneSignalUpdaterReady}
                            note="Required at /OneSignalSDKUpdaterWorker.js for production web push updates."
                        />
                        <ReadinessItem
                            label="OneSignal script present"
                            ok={readiness?.oneSignalLoaded}
                            note={readiness?.localPreview ? 'Skipped on localhost by design.' : 'Needed for production web push registration.'}
                        />
                        <ReadinessItem
                            label="Native Android shell"
                            ok={readiness?.nativeShell}
                            note="Needed for the real Firebase/OneSignal Android background test."
                        />
                        <ReadinessItem
                            label="Push subscription captured"
                            ok={readiness?.pushSubscriptionReady}
                            note="A saved OneSignal subscription is needed before an outside-app push can target this device."
                        />
                    </ul>
                </div>

                <div className="device-state-panel">
                    <div className="device-state-header">
                        <div>
                            <h2>Device state</h2>
                            <p>Use this while testing foreground, background, and notification-tap behavior.</p>
                        </div>
                        <button type="button" onClick={() => setBrowserStatus(`Refreshed ${new Date().toLocaleTimeString()}`)}>
                            Refresh
                        </button>
                    </div>
                    <div className="device-state-grid">
                        <StateTile label="Platform" value={readiness?.capacitorPlatform || 'web'} />
                        <StateTile label="Native shell" value={readiness?.nativeShell ? 'Yes' : 'No'} />
                        <StateTile label="App visibility" value={readiness?.visibilityState || 'unknown'} />
                        <StateTile label="Window focus" value={readiness?.focused ? 'Focused' : 'Not focused'} />
                        <StateTile label="Network" value={readiness?.online ? 'Online' : 'Offline'} />
                        <StateTile label="Native push flag" value={readiness?.nativePushEnabled ? 'Enabled' : 'Disabled'} />
                        <StateTile label="OneSignal app ID" value={readiness?.oneSignalAppIdPresent ? 'Present' : 'Missing'} />
                        <StateTile label="Device ID" value={deviceState?.maskedDeviceId || 'pending'} />
                        <StateTile label="Subscription" value={deviceState?.maskedSubscriptionId || 'not synced'} />
                        <StateTile label="Push token" value={deviceState?.pushTokenPresent ? 'Present' : 'Missing'} />
                        <StateTile label="Last sync" value={formatStateTime(deviceState?.lastSyncedAt)} />
                        <StateTile label="Last opened route" value={deviceState?.lastOpenedRoute || readiness?.lastOpenedRoute || 'none'} />
                    </div>
                    {deviceState?.lastError && <p className="device-state-error">{deviceState.lastError}</p>}
                    <div className="route-probe">
                        <label htmlFor="notification-route-probe">Deep-link route probe</label>
                        <div>
                            <input
                                id="notification-route-probe"
                                value={routeInput}
                                onChange={(event) => setRouteInput(event.target.value)}
                                placeholder="/chat?chatId=..."
                            />
                            <button type="button" onClick={runRoutePreview}>Open route</button>
                        </div>
                        <small>{routeStatus || `Normalized: ${normalizeNotificationRoute(routeInput || DEFAULT_ROUTE_TEST)}`}</small>
                    </div>
                </div>

                <div className="device-registry-panel">
                    <h2>Saved push targets</h2>
                    <p>{deviceRegistryStatus}</p>
                    {deviceRows.length > 0 && (
                        <div className="device-registry-list">
                            {deviceRows.map((row) => (
                                <div className="device-registry-row" key={`${row.device_id}-${row.onesignal_subscription_id}`}>
                                    <strong>{row.platform || 'unknown'} / {row.permission_status || 'unknown'}</strong>
                                    <span>Device {maskValue(row.device_id)} / Sub {maskValue(row.onesignal_subscription_id)}</span>
                                    <small>{row.revoked_at ? 'Revoked' : `Updated ${formatStateTime(row.updated_at || row.last_seen_at)}`}</small>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="preview-next-action">
                    <span className="next-action-label">Next action</span>
                    <strong>{nextAction.title}</strong>
                    <p>{nextAction.body}</p>
                </div>

                {readiness?.permission === 'denied' && (
                    <div className="permission-reset-card">
                        <div>
                            <span className="permission-reset-label">No Allow Button</span>
                            <h2>Notifications are blocked by the browser</h2>
                            <p>
                                Websites cannot reopen the native Allow prompt after a browser has been set to Block.
                                Reset the site permission first, then reload this page.
                            </p>
                        </div>
                        <ol>
                            <li>Open browser site settings for www.thecollegedate.com.</li>
                            <li>Set Notifications to Allow, or remove the blocked permission.</li>
                            <li>Reload this page and use Try browser notification again.</li>
                        </ol>
                        <button type="button" onClick={copyBrowserSettingsUrl}>
                            {settingsCopied ? 'Settings URL copied' : 'Copy Chrome settings URL'}
                        </button>
                    </div>
                )}

                <div className="android-test-plan">
                    <div>
                        <h2>Android background test</h2>
                        <p>
                            Use this when we are ready to prove the real outside-app notification path on a phone.
                        </p>
                    </div>
                    <ol>
                        <li>Install the latest Android build on a physical phone.</li>
                        <li>Log into Account B and allow notifications.</li>
                        <li>Send Account B a real chat message from Account A.</li>
                        <li>Confirm the phone notification appears while the app is backgrounded.</li>
                        <li>Tap the notification and confirm it opens the correct chat.</li>
                    </ol>
                    <button type="button" onClick={copyAndroidChecklist}>
                        {copied ? 'Copied' : 'Copy full checklist'}
                    </button>
                </div>

                <div className="preview-lab-note">
                    Outside-app notifications are delivered by OneSignal and Firebase after device permission is granted.
                </div>
            </section>
        </main>
    );
}

function getNextAction(readiness) {
    if (!readiness) {
        return {
            title: 'Checking notification readiness',
            body: 'The page is reading the current browser and device state.'
        };
    }

    if (readiness.permission === 'denied') {
        return {
            title: 'Reset notification permission',
            body: 'This browser has blocked notifications. For outside-app testing, use a browser/profile where permission can be granted, or move to Android device testing.'
        };
    }

    if (readiness.localPreview && !readiness.nativeShell) {
        return {
            title: 'Use this page for visuals, then test Android',
            body: 'Localhost can prove the in-app card design. Real background delivery must be tested in the Android app with OneSignal/Firebase.'
        };
    }

    if (!readiness.oneSignalLoaded && !readiness.nativeShell) {
        return {
            title: 'Load production push registration',
            body: 'Web push needs the OneSignal script and a registered service worker, which are intentionally skipped in this local browser setup.'
        };
    }

    if (!readiness.pushSubscriptionReady && readiness.nativeShell) {
        return {
            title: 'Confirm Android permission and registration',
            body: 'The native shell is visible, but this lab does not see a OneSignal subscription yet. Allow notifications, relaunch the app, then refresh this page.'
        };
    }

    return {
        title: 'Ready for live push validation',
        body: 'Send a real notification from another account and confirm it appears when this device is outside the active app.'
    };
}

function ReadinessItem({ label, ok, note }) {
    return (
        <li className={ok ? 'ready' : 'blocked'}>
            <span className="readiness-state">{ok ? 'Ready' : 'Blocked'}</span>
            <span>
                <strong>{label}</strong>
                <small>{note}</small>
            </span>
        </li>
    );
}

function StateTile({ label, value }) {
    return (
        <div className="device-state-tile">
            <span>{label}</span>
            <strong>{value || 'unknown'}</strong>
        </div>
    );
}

function maskValue(value) {
    if (!value || typeof value !== 'string') return 'none';
    if (value.length <= 10) return value;
    return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function formatStateTime(value) {
    if (!value) return 'none';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'unknown';
    return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
