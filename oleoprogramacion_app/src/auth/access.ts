import type { User } from '../types';

const PRODUCTIVITY_EXCLUDED_USERNAMES = new Set(['jcarlos']);

export function canAccessProductivity(user: Pick<User, 'role' | 'username'> | null | undefined) {
  if (!user || !['ADMIN', 'DIRECTIVO'].includes(user.role)) return false;
  return !PRODUCTIVITY_EXCLUDED_USERNAMES.has(String(user.username || '').trim().toLowerCase());
}
