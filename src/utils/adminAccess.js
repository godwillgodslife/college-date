const OWNER_ADMIN_EMAILS = [
  'godwillgodslife@gmail.com',
  'godswillgodwillgodlife@gmail.com',
];

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function hasTrustedAdminClaim(user) {
  return user?.app_metadata?.is_admin === true || user?.app_metadata?.role === 'admin';
}

export function isOwnerAdminEmail(email) {
  return OWNER_ADMIN_EMAILS.includes(normalizeEmail(email));
}

export function hasLocalAdminAccess(user) {
  return hasTrustedAdminClaim(user) || isOwnerAdminEmail(user?.email);
}
