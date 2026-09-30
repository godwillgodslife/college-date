import { createContext, useContext, useEffect, useState, useMemo } from 'react';

const THEME_STORAGE_KEY = 'tcd_theme_preference';

const ThemeContext = createContext({
    themePreference: 'system',
    effectiveTheme: 'dark',
    setThemePreference: () => {},
});

function getSystemTheme() {
    if (typeof window === 'undefined' || !window.matchMedia) return 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }) {
    const [themePreference, setThemePreferenceState] = useState(() => {
        if (typeof window === 'undefined') return 'system';
        try {
            const saved = localStorage.getItem(THEME_STORAGE_KEY);
            if (saved === 'light' || saved === 'dark' || saved === 'system') {
                return saved;
            }
        } catch {
            // ignore storage access errors
        }
        return 'system';
    });

    const [systemTheme, setSystemTheme] = useState(getSystemTheme);

    // Watch OS prefers-color-scheme changes
    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return;
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e) => {
            setSystemTheme(e.matches ? 'dark' : 'light');
        };

        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handler);
            return () => mediaQuery.removeEventListener('change', handler);
        } else if (mediaQuery.addListener) {
            mediaQuery.addListener(handler);
            return () => mediaQuery.removeListener(handler);
        }
    }, []);

    const effectiveTheme = useMemo(() => {
        return themePreference === 'system' ? systemTheme : themePreference;
    }, [themePreference, systemTheme]);

    // Apply theme tokens to root HTML element
    useEffect(() => {
        if (typeof document === 'undefined') return;
        const root = document.documentElement;

        root.setAttribute('data-theme', effectiveTheme);
        root.setAttribute('data-theme-preference', themePreference);

        if (effectiveTheme === 'light') {
            root.classList.add('theme-light');
            root.classList.remove('theme-dark');
        } else {
            root.classList.add('theme-dark');
            root.classList.remove('theme-light');
        }

        // Update meta theme-color for Android WebView & browser chrome
        let metaTheme = document.querySelector('meta[name="theme-color"]');
        if (!metaTheme) {
            metaTheme = document.createElement('meta');
            metaTheme.setAttribute('name', 'theme-color');
            document.head.appendChild(metaTheme);
        }
        metaTheme.setAttribute('content', effectiveTheme === 'light' ? '#f8f9fa' : '#09090e');
    }, [effectiveTheme, themePreference]);

    const setThemePreference = (pref) => {
        if (pref !== 'system' && pref !== 'light' && pref !== 'dark') return;
        setThemePreferenceState(pref);
        try {
            localStorage.setItem(THEME_STORAGE_KEY, pref);
        } catch {
            // ignore storage access errors
        }
    };

    const value = useMemo(() => ({
        themePreference,
        effectiveTheme,
        setThemePreference,
        isDark: effectiveTheme === 'dark',
    }), [themePreference, effectiveTheme]);

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
