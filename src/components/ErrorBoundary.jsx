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
        try {
            window.sessionStorage?.setItem('tcd_last_error', JSON.stringify({
                message: error?.message || String(error),
                stack: error?.stack,
                componentStack: errorInfo?.componentStack,
                url: typeof window !== 'undefined' ? window.location.href : '',
                timestamp: new Date().toISOString()
            }));
        } catch (_) {}

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
    };

    handleReset = () => {
        this.setState({ hasError: false, error: null });
        if (typeof this.props.onReset === 'function') {
            this.props.onReset();
        }
    };

    render() {
        if (this.state.hasError) {
            if (this.props.pageLevel) {
                return (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '60vh',
                        padding: '2rem 1.5rem',
                        textAlign: 'center',
                        fontFamily: 'var(--font-family, inherit)',
                        margin: 'auto',
                        maxWidth: '480px'
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>💫</div>
                        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.4rem', color: 'var(--text-primary, #fff)', fontWeight: '700' }}>
                            Something went wrong in this section
                        </h2>
                        <p style={{ color: 'var(--text-secondary, #94a3b8)', marginBottom: '1.25rem', fontSize: '0.9rem', lineHeight: '1.5' }}>
                            Don't worry, your data is safe. You can reload this view or head back to campus discovery.
                        </p>
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                            <button
                                type="button"
                                onClick={this.handleReset}
                                style={{
                                    padding: '0.65rem 1.5rem',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: 'var(--gradient-primary, linear-gradient(135deg, #ff6b6b, #ff8e53))',
                                    color: 'white',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    boxShadow: '0 4px 12px rgba(255, 107, 107, 0.3)'
                                }}
                            >
                                Try Again
                            </button>
                            <button
                                type="button"
                                onClick={() => { window.location.href = '/match'; }}
                                style={{
                                    padding: '0.65rem 1.5rem',
                                    borderRadius: '12px',
                                    border: '1px solid var(--border-default, rgba(255, 255, 255, 0.2))',
                                    background: 'var(--bg-secondary, rgba(255, 255, 255, 0.08))',
                                    color: 'var(--text-primary, #fff)',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                }}
                            >
                                Go to Match
                            </button>
                        </div>
                    </div>
                );
            }

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
