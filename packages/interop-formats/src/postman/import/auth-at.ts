import type { AuthResult, AuthSubject, InteropSecurityScheme } from '@mandor/interop-core';

import { authConfigOf } from './auth-config-of.js';

const WITHOUT_NONE = new Set<AuthSubject>(['workspace', 'collection']);

/**
 * The auth a level asks for, from the names it points at. `null` inherits, and so leaves no
 * auth to write; an empty list is no auth, which the workspace and the collection have no word
 * for either: a collection of Postman says no auth by saying nothing. A name
 * the document never declared is read as a scheme of that type with nothing in it.
 */
export function authAt(
    security: readonly string[] | null,
    schemes: Record<string, InteropSecurityScheme>,
    subject: AuthSubject,
): AuthResult {
    const name = security?.[0];

    if (security === null || (security.length === 0 && WITHOUT_NONE.has(subject))) {
        return { auth: undefined, degradations: [] };
    }

    if (name === undefined) {
        return { auth: { type: 'none' }, degradations: [] };
    }

    return authConfigOf(schemes[name] ?? { type: name, extras: {} }, subject);
}
