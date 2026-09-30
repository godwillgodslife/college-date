const OWNER_ADMIN_EMAILS = [
  'godwillgodslife@gmail.com',
  'godswillgodwillgodlife@gmail.com',
  'jackreecesokieprim@gmail.com',
];

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function hasTrustedAdminClaim(user) {
  const role = user?.app_metadata?.role;
  return user?.app_metadata?.is_admin === true || role === 'admin' || role === 'owner' || role === 'super_admin';
}

export function isOwnerAdminEmail(email) {
  return OWNER_ADMIN_EMAILS.includes(normalizeEmail(email));
}

export function hasLocalAdminAccess(user) {
  return hasTrustedAdminClaim(user) || isOwnerAdminEmail(user?.email);
}
