import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  isAndroidNative,
  checkAppUpdate,
  triggerInAppUpdate,
  completeFlexibleUpdate,
  recordUpdateDismissal,
  subscribeToInstallStatus,
  UPDATE_SEVERITY
} from '../services/appUpdateService';
import './AppUpdatePrompt.css';

export default function AppUpdatePrompt({ isUserTyping = false, hasActiveCall = false }) {
  const location = useLocation();
  const [updateInfo, setUpdateInfo] = useState(null);
  const [installStatus, setInstallStatus] = useState('UNKNOWN');
  const [isDismissed, setIsDismissed] = useState(false);
  const [isActionInProgress, setIsActionInProgress] = useState(false);

  // Check if current route is a sensitive context where prompts must be suppressed
  const isSensitiveRoute = useMemo(() => {
    const path = location.pathname || '';
    return (
      path.startsWith('/call') ||
      path.startsWith('/payment') ||
      path === '/mini-profile-setup' ||
      path === '/auth/callback' ||
      path === '/reset-password'
    );
  }, [location.pathname]);

  const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;

  // Evaluate if update modal should be visible
  const isModalVisible = useMemo(() => {
    if (!updateInfo || !updateInfo.updateAvailable) return false;
    if (isOffline) return false;

    // Level 3 (Required Update) is always shown unless offline (strictly non-bypassable)
    if (updateInfo.severity === UPDATE_SEVERITY.REQUIRED) {
      return true;
    }

    if (isDismissed) return false;

    // Normal and Important updates are suppressed during sensitive tasks or if in cooldown
    if (updateInfo.inCooldown) return false;
    if (isSensitiveRoute || hasActiveCall || isUserTyping) return false;

    return true;
  }, [updateInfo, isDismissed, isOffline, isSensitiveRoute, hasActiveCall, isUserTyping]);

  // Evaluate if "Update ready" pill should be visible
  const isReadyPillVisible = useMemo(() => {
    if (installStatus !== 'DOWNLOADED') return false;
    // Suppress during full screen call or payment callback to avoid interaction blocking
    if (hasActiveCall || location.pathname.startsWith('/call') || location.pathname.startsWith('/payment')) {
      return false;
    }
    return true;
  }, [installStatus, hasActiveCall, location.pathname]);

  // Query update status
  const runUpdateCheck = useCallback(async (options = {}) => {
    if (!isAndroidNative()) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

    if (options?.resetDismissed) {
      setIsDismissed(false);
    }

    try {
      const result = await checkAppUpdate();
      setInstallStatus(result?.installStatus || 'UNKNOWN');
      setUpdateInfo((prev) => {
        if (prev?.availableVersionCode !== result?.availableVersionCode) {
          setIsDismissed(false);
        }
        return result || null;
      });
    } catch (err) {
      console.warn('[AppUpdatePrompt] Update check skipped:', err);
    }
  }, []);

  useEffect(() => {
    if (!isAndroidNative()) return;

    // 1. Initial check (deferred to idle to preserve fast startup)
    const timer = setTimeout(() => {
      runUpdateCheck();
    }, 1200);

    // 2. Subscribe to installation status changes from Google Play
    const unsubscribe = subscribeToInstallStatus((statusData) => {
      if (statusData?.installStatus) {
        setInstallStatus(statusData.installStatus);
      }
    });

    // 3. Listen to network reconnection and test triggers
    const handleCheckTrigger = () => {
      setIsDismissed(false);
      runUpdateCheck();
    };
    window.addEventListener('online', handleCheckTrigger);
    window.addEventListener('tcd:force-update-check', handleCheckTrigger);

    // 4. Listen to native foregrounding
    let nativeListener = null;
    import('@capacitor/app').then(({ App }) => {
      App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          runUpdateCheck();
        }
      }).then((listener) => {
        nativeListener = listener;
      });
    }).catch(() => {});

    return () => {
      clearTimeout(timer);
      unsubscribe();
      window.removeEventListener('online', handleCheckTrigger);
      window.removeEventListener('tcd:force-update-check', handleCheckTrigger);
      nativeListener?.remove?.();
    };
  }, [runUpdateCheck]);

  const handleUpdateNow = async () => {
    if (!updateInfo) return;
    setIsActionInProgress(true);
    try {
      await triggerInAppUpdate(updateInfo.preferredType || 'FLEXIBLE');
    } catch (err) {
      console.warn('[AppUpdatePrompt] Trigger update error:', err);
    } finally {
      setIsActionInProgress(false);
    }
  };

  const handleDismiss = () => {
    if (!updateInfo) return;
    setIsDismissed(true);
    recordUpdateDismissal(updateInfo.availableVersionCode);
  };

  const handleRestartAndApply = async () => {
    setIsActionInProgress(true);
    try {
      await completeFlexibleUpdate();
    } catch (err) {
      console.error('[AppUpdatePrompt] Complete update error:', err);
    } finally {
      setIsActionInProgress(false);
    }
  };

  if (typeof window !== 'undefined') {
    window.__TCD_UPDATE_PROMPT_STATE__ = {
      updateInfo,
      installStatus,
      isDismissed,
      isOffline,
      isSensitiveRoute,
      hasActiveCall,
      isUserTyping,
      isModalVisible,
      isReadyPillVisible
    };
    window.__TCD_RUN_UPDATE_CHECK__ = runUpdateCheck;
    window.__TCD_RESET_UPDATE_PROMPT__ = () => setIsDismissed(false);
  }

  // If downloaded in background and ready to restart
  if (isReadyPillVisible) {
    return (
      <div className="app-update-ready-pill" role="status" aria-live="polite">
        <div className="app-update-ready-content">
          <span className="app-update-ready-icon" aria-hidden="true">🚀</span>
          <div className="app-update-ready-text">
            <span className="app-update-ready-title">Update Ready to Install</span>
            <span className="app-update-ready-subtitle">Restart College Date to apply the latest version</span>
          </div>
        </div>
        <button
          type="button"
          className="btn-restart-update"
          onClick={handleRestartAndApply}
          disabled={isActionInProgress}
        >
          {isActionInProgress ? 'Restarting...' : 'Restart & Update'}
        </button>
      </div>
    );
  }

  // If update card/modal is not eligible to display
  if (!isModalVisible) {
    return null;
  }

  const isRequired = updateInfo.severity === UPDATE_SEVERITY.REQUIRED;
  const isImportant = updateInfo.severity === UPDATE_SEVERITY.IMPORTANT;

  return (
    <div
      className="app-update-prompt-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-update-dialog-title"
    >
      <div className={`app-update-card ${isRequired ? 'required' : ''}`}>
        <div className={`app-update-icon-wrapper ${isRequired ? 'required' : ''}`}>
          {isRequired ? '⚠️' : '💖'}
        </div>

        {isRequired ? (
          <span className="app-update-badge required">Update Required</span>
        ) : isImportant ? (
          <span className="app-update-badge important">Recommended Update</span>
        ) : null}

        <h2 id="app-update-dialog-title" className="app-update-title">
          {isRequired
            ? 'Update Required'
            : isImportant
            ? 'College Date has an update'
            : 'A new version is here'}
        </h2>

        <p className="app-update-description">
          {updateInfo.reason ||
            (isRequired
              ? 'Your version of College Date is no longer supported. Please update to continue.'
              : "We've made improvements to make College Date faster, smoother, and more reliable.")}
        </p>

        <div className="app-update-actions">
          <button
            type="button"
            className={`btn-update-primary ${isRequired ? 'required' : ''}`}
            onClick={handleUpdateNow}
            disabled={isActionInProgress}
          >
            {isActionInProgress
              ? 'Opening Play Store...'
              : isRequired
              ? 'Update College Date'
              : 'Update now'}
          </button>

          {!isRequired && (
            <button
              type="button"
              className="btn-update-later"
              onClick={handleDismiss}
              disabled={isActionInProgress}
            >
              Later
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
