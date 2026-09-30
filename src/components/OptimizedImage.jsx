import { useState, useEffect, useRef } from 'react';
import { performanceMonitor } from '../utils/performanceMonitor';
import { cacheMediaSource, getCachedMediaObjectUrl } from '../lib/mediaCache';
import { getOptimizedUrl } from '../lib/imageUrl';
import './OptimizedImage.css';

export default function OptimizedImage({
    src,
    alt,
    placeholder,
    width,
    height,
    className = "",
    quality = 60,
    priority = false,
    onError,
    draggable = false
}) {
    const optimizedUrl = getOptimizedUrl(src, width, quality);
    const [cachedDisplay, setCachedDisplay] = useState({ source: null, url: null });
    const [hasError, setHasError] = useState(false);
    const displayUrl = cachedDisplay.source === optimizedUrl && cachedDisplay.url
        ? cachedDisplay.url
        : optimizedUrl;
    const startTimeRef = useRef(0);

    useEffect(() => {
        setHasError(false);
    }, [displayUrl]);

    useEffect(() => {
        startTimeRef.current = performance.now();
    }, [optimizedUrl]);

    useEffect(() => {
        let cancelled = false;
        let objectUrl = null;

        async function hydrateCachedImage() {
            if (!optimizedUrl) return;

            // 1. Cache-first: Render from local disk/Cache API immediately if already cached
            try {
                const cachedUrl = await getCachedMediaObjectUrl(optimizedUrl);
                if (!cancelled && cachedUrl) {
                    objectUrl = cachedUrl;
                    setCachedDisplay({ source: optimizedUrl, url: cachedUrl });
                    return;
                }
            } catch (e) {
                // Continue to network if cache read fails
            }

            // 2. If online and not yet cached, fetch and populate local media cache
            if (typeof navigator === 'undefined' || navigator.onLine !== false) {
                cacheMediaSource(optimizedUrl).catch(() => {});
            }
        }

        hydrateCachedImage();

        return () => {
            cancelled = true;
            if (objectUrl) window.URL.revokeObjectURL(objectUrl);
        };
    }, [optimizedUrl]);

    const handleLoad = () => {
        if (performanceMonitor.isEnabled()) {
            const duration = performance.now() - startTimeRef.current;
            performanceMonitor.recordImageLoad(optimizedUrl, duration);
        }
    };

    const handleError = (e) => {
        setHasError(true);
        if (onError) onError(e);
    };
    
    // isLoaded state removed to prevent infinite blanks on cache hits
    return (
        <div className={`opt-image-container ${className}`}>
            {placeholder && !hasError && (
                <img
                    src={placeholder}
                    className="opt-image-placeholder"
                    alt=""
                    aria-hidden="true"
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 1 }}
                    draggable={draggable}
                />
            )}
            {displayUrl && !hasError ? (
                <img
                    src={displayUrl}
                    alt={alt}
                    className="opt-image-main visible"
                    loading={priority ? "eager" : "lazy"}
                    fetchPriority={priority ? "high" : "auto"}
                    width={width}
                    height={height}
                    style={{ position: 'relative', zIndex: 2 }}
                    onLoad={handleLoad}
                    onError={handleError}
                    draggable={draggable}
                />
            ) : hasError ? (
                <div 
                    className="opt-image-error-fallback"
                    style={{
                        position: 'relative',
                        zIndex: 2,
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.1))',
                        color: 'var(--text-muted, #94a3b8)',
                        fontWeight: '700',
                        fontSize: width ? `${Math.max(16, Math.floor(width / 3))}px` : '1.5rem',
                        userSelect: 'none'
                    }}
                >
                    {alt ? alt.charAt(0).toUpperCase() : '👤'}
                </div>
            ) : null}
        </div>
    );
}
