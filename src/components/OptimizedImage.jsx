import { useState, useEffect } from 'react';
import './OptimizedImage.css';

/**
 * OptimizedImage component for high performance on 1GB RAM devices.
 * Uses Supabase image transformation and lazy loading.
 */
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
    const [isLoaded, setIsLoaded] = useState(false);
    const [currentSrc, setCurrentSrc] = useState(null);

    useEffect(() => {
        if (!src) return;

        // Detect low-end device (crude but effective for RAM optimization)
        const isLowEnd = (navigator.deviceMemory && navigator.deviceMemory < 2) ||
            (navigator.connection && (navigator.connection.saveData || ['slow-2g', '2g', '3g'].includes(navigator.connection.effectiveType)));

        let optimizedUrl = src;

        // If it's a Supabase URL, we can inject transformation parameters
        if (src.includes('supabase.co/storage/v1/object/public/')) {
            const transformParams = ['format=webp']; // Force WebP for all

            if (isLowEnd) {
                transformParams.push('width=150');
                transformParams.push('quality=50');
            } else {
                if (width) transformParams.push(`width=${width}`);
                transformParams.push(`quality=${quality}`);
            }

            // Check if URL already has query params
            const separator = src.includes('?') ? '&' : '?';
            optimizedUrl = `${src}${separator}${transformParams.join('&')}`;
        }

        setCurrentSrc(optimizedUrl);
    }, [src, width, quality]);

    return (
        <div className={`opt-image-container ${className} ${isLoaded ? 'loaded' : ''}`}>
            {placeholder && !isLoaded && (
                <img
                    src={placeholder}
                    className="opt-image-placeholder"
                    alt=""
                    aria-hidden="true"
                />
            )}
            {currentSrc && (
                <img
                    src={currentSrc}
                    alt={alt}
                    onLoad={() => setIsLoaded(true)}
                    className={`opt-image-main ${isLoaded ? 'visible' : 'hidden'}`}
                    loading={priority ? "eager" : "lazy"}
                    fetchPriority={priority ? "high" : "auto"}
                    width={width}
                    height={height}
                />
            )}
        </div>
    );
}
