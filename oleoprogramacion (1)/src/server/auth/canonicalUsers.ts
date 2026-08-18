export type CanonicalRole = 'ADMIN' | 'DIRECTIVO' | 'SUPERVISOR';

export interface CanonicalUser {
  id: string;
  username: string;
  name: string;
  role: CanonicalRole;
  idSupervisor: string | null;
  phone: string | null;
  initialPin: string;
  active: boolean;
}

export const CANONICAL_USERS_VERSION = 'oleoflores-users-2026-08-v1';

/**
 * Catálogo de acceso aprobado para el MVP. Este archivo vive únicamente en el
 * servidor: los PIN iniciales nunca forman parte del bundle del navegador ni se
 * guardan en Firestore en texto plano.
 */
export const CANONICAL_USERS: readonly CanonicalUser[] = [
  {
    id: 'USR-73ACD9A5',
    username: 'admin',
    name: 'Administrador Agronomía',
    role: 'ADMIN',
    idSupervisor: null,
    phone: null,
    initialPin: '0910',
    active: true,
  },
  {
    id: 'USR-09EBDA48',
    username: 'lcruz',
    name: 'Directivo Agronomía',
    role: 'DIRECTIVO',
    idSupervisor: null,
    phone: null,
    initialPin: '0000',
    active: true,
  },
  {
    id: 'USR-PCHAVEZ0',
    username: 'pchavez',
    name: 'Paola Chavez',
    role: 'DIRECTIVO',
    idSupervisor: null,
    phone: null,
    initialPin: '0000',
    active: true,
  },
  {
    id: 'USR-JCARLOS0',
    username: 'jcarlos',
    name: 'Ingeniero Juan Carlos',
    role: 'DIRECTIVO',
    idSupervisor: null,
    phone: null,
    initialPin: '0000',
    active: true,
  },
  {
    id: 'USR-9DEC0023',
    username: '573207587860',
    name: 'Cuenta heredada pendiente de identificación',
    role: 'SUPERVISOR',
    idSupervisor: 'SUP001',
    phone: '573207587860',
    initialPin: '1234',
    active: false,
  },
  {
    id: 'USR-02F2E9D9',
    username: 'josep',
    name: 'José Pahuana',
    role: 'SUPERVISOR',
    idSupervisor: 'SUP002',
    phone: '573175364429',
    initialPin: '1234',
    active: true,
  },
  {
    id: 'USR-12F86B0E',
    username: 'alvarom',
    name: 'Alvaro Manjarrez',
    role: 'SUPERVISOR',
    idSupervisor: 'SUP003',
    phone: '573168479957',
    initialPin: '1234',
    active: true,
  },
  {
    id: 'USR-9AD2EAC3',
    username: 'giovannya',
    name: 'Giovanny Anaya',
    role: 'SUPERVISOR',
    idSupervisor: 'SUP004',
    phone: '573167680373',
    initialPin: '1234',
    active: true,
  },
  {
    id: 'USR-C262C7D5',
    username: 'manuelb',
    name: 'Manuel Blanco',
    role: 'SUPERVISOR',
    idSupervisor: 'SUP005',
    phone: '573128840721',
    initialPin: '1234',
    active: true,
  },
  {
    id: 'USR-F9655361',
    username: 'luisb',
    name: 'Luis Barraza',
    role: 'SUPERVISOR',
    idSupervisor: 'SUP006',
    phone: '573126116644',
    initialPin: '1234',
    active: true,
  },
  {
    id: 'USR-010BBE48',
    username: 'juanb',
    name: 'Juan Bohorquez',
    role: 'SUPERVISOR',
    idSupervisor: 'SUP007',
    phone: '573217037675',
    initialPin: '1234',
    active: true,
  },
] as const;

export const CANONICAL_SUPERVISORS = CANONICAL_USERS
  .filter((user) => user.role === 'SUPERVISOR' && user.active)
  .map((user) => ({
    id: user.idSupervisor as string,
    name: user.name,
    phone: user.phone ?? '',
    active: true,
  }));

export function normalizeUsername(value: unknown): string {
  return String(value ?? '').trim().toLocaleLowerCase('es-CO');
}
