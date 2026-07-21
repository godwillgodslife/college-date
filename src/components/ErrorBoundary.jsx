import { Component } from 'react';

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
        const message = String(error?.message || error || '');
        if (message.includes("Cannot access 'canReadFinance' before initialization")) {
            this.recoverFromStaleAppShell('admin-permission-tdz', {
                force: true,
                immediateReload: true,
            });
        }
    }

    recoverFromStaleAppShell = async (reason = 'manual', options = {}) => {
        const storageKey = `error-boundary-recovery:${reason}`;
        const reloadWithFreshUrl = () => {
            const url = new URL(window.location.href);
            url.searchParams.set('recovered', String(Date.now()));
            window.location.replace(url.toString());
        };

        try {
            if (window.sessionStorage?.getItem(storageKey) && !options.force) {
                reloadWithFreshUrl();
                return;
            }
            window.sessionStorage?.setItem(storageKey, new Date().toISOString());

            if (options.immediateReload) {
                setTimeout(reloadWithFreshUrl, 250);
            }

            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(registrations.map(registration => registration.unregister()));
            }

            if ('caches' in window) {
                const keys = await caches.keys();
                await Promise.all(keys.map(key => caches.delete(key)));
            }
        } catch (err) {
            console.warn('Error recovery cleanup failed:', err);
        }

        reloadWithFreshUrl();
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    padding: '2rem',
                    textAlign: 'center',
                    fontFamily: 'var(--font-family)',
                }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>😔</div>
                    <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                        Something went wrong
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', maxWidth: '400px' }}>
                        Don't worry, your data is safe. Try refreshing the page.
                    </p>
                    <button
                        onClick={() => this.recoverFromStaleAppShell('manual')}
                        style={{
                            padding: '0.75rem 2rem',
                            borderRadius: '12px',
                            border: 'none',
                            background: 'var(--gradient-primary)',
                            color: 'white',
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontSize: '1rem',
                        }}
                    >
                        Refresh Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
