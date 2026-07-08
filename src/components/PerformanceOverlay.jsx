import { useState, useEffect } from 'react';
import { performanceMonitor } from '../utils/performanceMonitor';
import '../styles/performanceDashboard.css';

export default function PerformanceOverlay() {
    const [isOpen, setIsOpen] = useState(false);
    const [isEnabled, setIsEnabled] = useState(() => {
        return localStorage.getItem('enable_profiling') === 'true';
    });
    const [metrics, setMetrics] = useState(() => performanceMonitor.getMetrics());

    useEffect(() => {
        if (!performanceMonitor.isEnabled()) return;

        // Poll metrics updates every 1.5 seconds when open
        let timer;
        if (isOpen) {
            timer = setInterval(() => {
                setMetrics(performanceMonitor.getMetrics());
            }, 1500);
        }
        return () => clearInterval(timer);
    }, [isOpen]);

    // Force update once on render/open
    useEffect(() => {
        if (isOpen) {
            setMetrics(performanceMonitor.getMetrics());
        }
    }, [isOpen]);

    if (!performanceMonitor.isEnabled()) {
        // If not enabled, we still want to show a hidden double-tap or a mechanism to enable?
        // Let's just show a toggle if the URL param enabled it, or return null if completely off.
        const urlParams = new URLSearchParams(window.location.search);
        if (!urlParams.has('enable-profiling') && localStorage.getItem('enable_profiling') !== 'true') {
            return null;
        }
    }

    const toggleProfiling = (e) => {
        const nextState = !isEnabled;
        setIsEnabled(nextState);
        if (nextState) {
            localStorage.setItem('enable_profiling', 'true');
        } else {
            localStorage.removeItem('enable_profiling');
        }
        if (confirm(`Profiling state changed. Reload the app to apply?`)) {
            window.location.reload();
        }
    };

    const handleClear = () => {
        performanceMonitor.clearMetrics();
        setMetrics(performanceMonitor.getMetrics());
    };

    const slowestOps = performanceMonitor.getSlowestOperations();
    const currentTransition = metrics.currentTransition;
    const latestTransition = metrics.transitions[metrics.transitions.length - 1];

    const getDurationColorClass = (ms) => {
        if (ms > 200) return 'slow';
        if (ms > 80) return 'medium';
        return 'fast';
    };

    return (
        <>
            {/* Floating Badge */}
            {!isOpen && (
                <div className="perf-badge" onClick={() => setIsOpen(true)}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                        <path d="M8 12a4 4 0 1 1 8 0 4 4 0 0 1-8 0z"/>
                    </svg>
                    <span>Perf</span>
                </div>
            )}

            {/* Dashboard Panel */}
            {isOpen && (
                <div className="perf-panel">
                    <div className="perf-header">
                        <h3>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                <line x1="9" y1="3" x2="9" y2="21"/>
                                <line x1="15" y1="3" x2="15" y2="21"/>
                                <line x1="3" y1="9" x2="21" y2="9"/>
                                <line x1="3" y1="15" x2="21" y2="15"/>
                            </svg>
                            Performance Dashboard
                        </h3>
                        <div className="perf-actions">
                            <button className="perf-btn" onClick={handleClear} title="Clear Metrics">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/>
                                </svg>
                            </button>
                            <button className="perf-btn close-btn" onClick={() => setIsOpen(false)}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <line x1="18" y1="6" x2="6" y2="18"/>
                                    <line x1="6" y1="6" x2="18" y2="18"/>
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div className="perf-content">
                        {/* 1. Core Timeline Metrics */}
                        <div className="perf-section">
                            <div className="perf-section-title">Core Timing</div>
                            <div className="perf-grid">
                                <div className="perf-card">
                                    <span className="perf-card-label">Cold Startup</span>
                                    <span className="perf-card-value">
                                        {metrics.startup ? `${metrics.startup.toFixed(0)} ms` : 'N/A'}
                                    </span>
                                </div>
                                <div className="perf-card">
                                    <span className="perf-card-label">Time to Interactive</span>
                                    <span className="perf-card-value interactive">
                                        {metrics.tti ? `${(metrics.tti / 1000).toFixed(2)} s` : 'N/A'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 2. Active/Latest Navigation */}
                        <div className="perf-section">
                            <div className="perf-section-title">
                                {currentTransition && !currentTransition.settled ? 'Active Route Load' : 'Last Route Load'}
                            </div>
                            {(() => {
                                const t = (currentTransition && !currentTransition.settled) ? currentTransition : latestTransition;
                                if (!t) return <div style={{ color: '#6b7280', fontSize: '11px' }}>No navigations completed yet.</div>;
                                
                                const typeClass = getDurationColorClass(t.renderDuration);
                                return (
                                    <div className="perf-list">
                                        <div className="perf-list-item">
                                            <div className="perf-item-info">
                                                <span className="perf-item-label">{t.name} (Render)</span>
                                                <span className="perf-item-detail">
                                                    DB: {t.dbQueries.length + t.rpcs.length} | API: {t.fetches.length} | Images: {t.images.length}
                                                </span>
                                            </div>
                                            <span className={`perf-item-duration ${typeClass}`}>
                                                {t.renderDuration.toFixed(0)} ms
                                            </span>
                                        </div>
                                        <div className="perf-list-item" style={{ background: 'rgba(52, 211, 153, 0.05)' }}>
                                            <div className="perf-item-info">
                                                <span className="perf-item-label" style={{ color: '#34d399' }}>Total Interactive Time</span>
                                                <span className="perf-item-detail">Full transition + quiescent state</span>
                                            </div>
                                            <span className="perf-item-duration" style={{ color: '#34d399' }}>
                                                {t.totalInteractiveTime ? `${(t.totalInteractiveTime / 1000).toFixed(2)} s` : 'Calculating...'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* 3. Slowest Operations */}
                        <div className="perf-section">
                            <div className="perf-section-title">Slowest 10 Operations</div>
                            <div className="perf-list">
                                {slowestOps.length === 0 ? (
                                    <div style={{ color: '#6b7280', fontSize: '11px' }}>No operations recorded.</div>
                                ) : (
                                    slowestOps.map((op, idx) => {
                                        const typeClass = getDurationColorClass(op.duration);
                                        const cleanType = op.type.toLowerCase().replace(/\s+/g, '-');
                                        return (
                                            <div key={idx} className="perf-list-item">
                                                <div className="perf-item-info">
                                                    <span className={`perf-item-type ${cleanType}`}>{op.type}</span>
                                                    <span className="perf-item-label" title={op.label}>{op.label}</span>
                                                    {op.detail && <span className="perf-item-detail" title={op.detail}>{op.detail}</span>}
                                                </div>
                                                <span className={`perf-item-duration ${typeClass}`}>
                                                    {op.duration.toFixed(0)} ms
                                                </span>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="perf-footer">
                        <div className="perf-toggle-container">
                            <span>Persistent Profiling</span>
                            <label className="perf-switch">
                                <input type="checkbox" checked={isEnabled} onChange={toggleProfiling} />
                                <span className="perf-slider"></span>
                            </label>
                        </div>
                        <span style={{ fontSize: '10px', color: '#6b7280' }}>
                            v{import.meta.env.VITE_APP_VERSION || '2.2'}
                        </span>
                    </div>
                </div>
            )}
        </>
    );
}
