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
    priority = false
}) {
    const optimizedUrl = getOptimizedUrl(src, width, quality);
    const [cachedDisplay, setCachedDisplay] = useState({ source: null, url: null });
    const displayUrl = cachedDisplay.source === optimizedUrl && cachedDisplay.url
        ? cachedDisplay.url
        : optimizedUrl;
    const startTimeRef = useRef(0);

    useEffect(() => {
        startTimeRef.current = performance.now();
    }, [optimizedUrl]);

    useEffect(() => {
        let cancelled = false;
        let objectUrl = null;

        async function hydrateCachedImage() {
            if (!optimizedUrl) return;

            if (typeof navigator !== 'undefined' && navigator.onLine === false) {
                const cachedUrl = await getCachedMediaObjectUrl(optimizedUrl);
                if (!cancelled && cachedUrl) {
                    objectUrl = cachedUrl;
                    setCachedDisplay({ source: optimizedUrl, url: cachedUrl });
                }
                return;
            }

            cacheMediaSource(optimizedUrl).catch(() => {});
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
    
    // isLoaded state removed to prevent infinite blanks on cache hits
    return (
        <div className={`opt-image-container ${className}`}>
            {placeholder && (
                <img
                    src={placeholder}
                    className="opt-image-placeholder"
                    alt=""
                    aria-hidden="true"
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 1 }}
                />
            )}
            {displayUrl && (
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
                />
            )}
        </div>
    );
}
