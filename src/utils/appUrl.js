// Central application URL resolution helper
// Ensures links shared to external apps (WhatsApp, Instagram, Clipboard)
// always resolve to the production domain rather than native app 'localhost' origins.

export const PUBLIC_APP_URL = (
    import.meta.env.VITE_PUBLIC_APP_URL || 'https://www.thecollegedate.com'
).replace(/\/$/, '');

export const getPublicAppUrl = (path = '') => {
    if (!path) return PUBLIC_APP_URL;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${PUBLIC_APP_URL}${cleanPath}`;
};
