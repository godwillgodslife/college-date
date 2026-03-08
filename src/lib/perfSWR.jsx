import { SWRConfig } from 'swr';

/**
 * Global SWR Configuration
 * - revalidateOnFocus: false (reduce unnecessary requests on limited data)
 * - dedupeInterval: 5000 (prevent duplicate requests within 5 secs)
 * - errorRetryCount: 3
 */
export const SWRProvider = ({ children }) => {
    return (
        <SWRConfig
            value={{
                revalidateOnFocus: false,
                revalidateOnReconnect: true,
                dedupingInterval: 5000,
                shouldRetryOnError: true,
                errorRetryCount: 3,
                fallback: {} // Can be used for SSR or pre-cached data
            }}
        >
            {children}
        </SWRConfig>
    );
};
