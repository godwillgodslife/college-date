import { useState, useEffect, useRef } from 'react';
import { performanceMonitor } from '../utils/performanceMonitor';
import './OptimizedImage.css';

/**
 * OptimizedImage component for high performance on 1GB RAM devices.
 * Uses Supabase image transformation and lazy loading.
 */
export function getOptimizedUrl(src, width, quality = 60) {
    if (!src) return src;
    
    // Supabase Free Tier actively blocks requests that contain 'width' or 'quality' 
    // query parameters, returning a 400 Bad Request instead of ignoring them.
    // We must return the raw URL exactly as it is for Free tier compatibility.
    return src;
}

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
    const startTimeRef = useRef(performance.now());

    useEffect(() => {
        startTimeRef.current = performance.now();
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
            {optimizedUrl && (
                <img
                    src={optimizedUrl}
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
