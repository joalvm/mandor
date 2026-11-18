import { chooseByKey, type InteropSecurityScheme, type KeyHandlers } from '@mandor/interop-core';
import { z } from 'zod';

import type { PostmanAuth } from '../document/postman-collection-schema.js';

export type AuthChoice =
    { kind: 'inherit' } | { kind: 'none' } | { kind: 'scheme'; scheme: InteropSecurityScheme };

type SecurityChoice = { security: string[] | null; scheme?: InteropSecurityScheme };

/** The parameters of a scheme as a list of key and value, or in the older form, one object. */
const params = z.union([
    z
        .array(z.object({ key: z.string(), value: z.unknown().optional() }).loose())
        .transform((rows) => rows.map(({ key, value }) => [key, value] as const)),
    z.record(z.string(), z.unknown()).transform((written) => Object.entries(written)),
]);

/** The types that ask for no scheme at all, and what each asks for. */
const FIXED_CHOICES = new Map<string, () => AuthChoice>([
    ['inherit', () => ({ kind: 'inherit' })],
    ['noauth', () => ({ kind: 'none' })],
]);

/**
 * What the auth of a collection, a folder or a request asks for. Nothing written, `null` and
 * `inherit` ask for the level above; `noauth` asks for none; the rest is a scheme, with its
 * parameters (`key` → `value`) as the document wrote them, secrets and all: the IR keeps
 * everything and the step to resources decides what Mandor holds.
 */
export function authSchemeOf(auth: PostmanAuth | null | undefined): AuthChoice {
    if (auth === null || auth === undefined) {
        return { kind: 'inherit' };
    }

    const fixed = FIXED_CHOICES.get(auth.type);

    if (fixed !== undefined) {
        return fixed();
    }

    const read = params.safeParse(auth[auth.type]);
    const extras = Object.fromEntries(read.success ? read.data : []);

    return { kind: 'scheme', scheme: { type: auth.type, extras } };
}

/**
 * What an auth choice puts in the document: the names a group or an operation asks for (`null`
 * inherits, `[]` is none) and, for a scheme, the scheme itself under `key`.
 */
export function securityOf(choice: AuthChoice, key: string): SecurityChoice {
    const security: KeyHandlers<'kind', AuthChoice, SecurityChoice> = {
        inherit: () => ({ security: null }),
        none: () => ({ security: [] }),
        scheme: ({ scheme }) => ({ security: [key], scheme }),
    };

    return chooseByKey(security, choice.kind, choice);
}
