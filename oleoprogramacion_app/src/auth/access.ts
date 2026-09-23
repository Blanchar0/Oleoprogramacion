import type { User } from '../types';

const PRODUCTIVITY_EXCLUDED_USERNAMES = new Set(['jcarlos']);
const ALDO_ALLOWED_ROUTES = new Set(['/', '/programming/all']);

export function canAccessPage(user: Pick<User, 'role' | 'username'> | null | undefined, path: string) {
  if (!user) return false;
  if (user.role === 'DIRECTIVO' && String(user.username || '').trim().toLowerCase() === 'aldo') {
    return ALDO_ALLOWED_ROUTES.has(path);
  }
  return true;
}

export function canAccessProductivity(user: Pick<User, 'role' | 'username'> | null | undefined) {
  if (!user || !['ADMIN', 'DIRECTIVO'].includes(user.role) || !canAccessPage(user, '/productivity')) return false;
  return !PRODUCTIVITY_EXCLUDED_USERNAMES.has(String(user.username || '').trim().toLowerCase());
}
