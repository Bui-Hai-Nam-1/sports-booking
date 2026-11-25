import { isNonEmptyString, isRecord } from '../types/api.types';

export const APP_ROLES = ['CUSTOMER', 'OWNER', 'ADMIN'] as const;

export type AppRole = (typeof APP_ROLES)[number];

export interface AuthenticatedUser {
  id: string;
  userId: string;
  role: AppRole;
  email?: string;
}

export interface JwtTokenPayload {
  sub: string;
  email?: string;
  role?: AppRole;
  iat?: number;
  exp?: number;
}

/**
 * Type guard checking whether a runtime value is a valid system role.
 */
export function isAppRole(value: unknown): value is AppRole {
  return typeof value === 'string' && (APP_ROLES as readonly string[]).includes(value);
}

/**
 * Normalizes request.user across team auth integrations ({ id } or { userId }).
 */
export function normalizeAuthenticatedUser(raw: unknown): AuthenticatedUser | null {
  if (!isRecord(raw) || !isAppRole(raw.role)) {
    return null;
  }
  const idCandidate = isNonEmptyString(raw.id)
    ? raw.id
    : isNonEmptyString(raw.userId)
      ? raw.userId
      : null;

  if (!idCandidate) {
    return null;
  }

  return {
    id: idCandidate,
    userId: idCandidate,
    role: raw.role,
    email: isNonEmptyString(raw.email) ? raw.email : undefined,
  };
}

/**
 * Type guard checking a decoded JWT object conforms to JwtTokenPayload.
 */
export function isJwtTokenPayload(value: unknown): value is JwtTokenPayload {
  if (!isRecord(value) || !isNonEmptyString(value.sub)) {
    return false;
  }
  if (value.role !== undefined && !isAppRole(value.role)) {
    return false;
  }
  if (value.exp !== undefined && typeof value.exp !== 'number') {
    return false;
  }
  return true;
}
