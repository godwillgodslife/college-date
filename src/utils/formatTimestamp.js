/**
 * Smart timestamp formatter for chat previews.
 * - Within today: "Today at 07:50 PM"
 * - Yesterday: "Yesterday at 07:50 PM"
 * - Within last 6 days: "Mon at 07:50 PM"
 * - Same year: "Mar 5 at 07:50 PM"
 * - Older: "05/03/2026"
 */
export function formatChatTimestamp(dateString) {
    if (!dateString) return '';

    const date = new Date(dateString);
    const now = new Date();

    // Normalize to midnight for day comparison
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.round((todayStart - dateStart) / (1000 * 60 * 60 * 24));

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (diffDays === 0) return `Today at ${timeStr}`;
    if (diffDays === 1) return `Yesterday at ${timeStr}`;
    if (diffDays < 7) {
        const dayName = date.toLocaleDateString([], { weekday: 'short' });
        return `${dayName} at ${timeStr}`;
    }
    if (date.getFullYear() === now.getFullYear()) {
        const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        return `${dateStr} at ${timeStr}`;
    }
    // Older than a year: compact date
    return date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Short version for sidebar timestamp (just time or day).
 */
export function formatSidebarTimestamp(dateString) {
    if (!dateString) return '';

    const date = new Date(dateString);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.round((todayStart - dateStart) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });
}

/**
 * Formats a "Last seen" time.
 * Returns "Online now" if the date is null or very recent (handled by Presence),
 * otherwise returns "Last seen Today at 05:30 PM" etc.
 */
export function formatLastSeen(dateString) {
    if (!dateString) return 'Offline';
    const formatted = formatChatTimestamp(dateString);
    return `Last seen ${formatted.toLowerCase()}`;
}
