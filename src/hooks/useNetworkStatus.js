import { useEffect, useMemo, useState } from 'react';

function getConnectionState() {
  if (typeof navigator === 'undefined') {
    return {
      online: true,
      slow: false,
      effectiveType: 'unknown',
      saveData: false,
    };
  }

  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const effectiveType = connection?.effectiveType || 'unknown';
  const slow = Boolean(
    connection?.saveData ||
    effectiveType === 'slow-2g' ||
    effectiveType === '2g'
  );

  return {
    online: navigator.onLine !== false,
    slow,
    effectiveType,
    saveData: Boolean(connection?.saveData),
  };
}

export function useNetworkStatus() {
  const [state, setState] = useState(getConnectionState);

  useEffect(() => {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const update = () => setState(getConnectionState());

    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    connection?.addEventListener?.('change', update);

    update();

    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
      connection?.removeEventListener?.('change', update);
    };
  }, []);

  return useMemo(() => ({
    ...state,
    label: !state.online
      ? "You're offline. Showing saved content."
      : state.slow
        ? 'Connection is slow. Keeping saved content ready.'
        : '',
  }), [state]);
}
