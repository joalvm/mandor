import { type InteropSecurityScheme, isRecord } from '@mandor/interop-core';

import { stripParserNotes } from '../document/parser-notes.js';

/**
 * The security the document declares by name. The registry keeps `type` apart because it is what
 * says which kind of credential Mandor is being asked for; everything else rides as written.
 */
export function securitySchemesOf(
    raw: Record<string, unknown>,
): Record<string, InteropSecurityScheme> {
    const declared = rawAt(raw, 'components', 'securitySchemes');

    if (declared === undefined) {
        return {};
    }

    const schemes: Record<string, InteropSecurityScheme> = {};

    for (const [name, value] of Object.entries(declared)) {
        const scheme = schemeOf(value);

        if (scheme !== undefined) {
            schemes[name] = scheme;
        }
    }

    return schemes;
}

function schemeOf(value: unknown): InteropSecurityScheme | undefined {
    const clean = stripParserNotes(value);

    if (!isRecord(clean)) {
        return undefined;
    }

    const { type, ...extras } = clean;

    if (typeof type !== 'string') {
        return undefined;
    }

    return { type, extras };
}

/**
 * The names a server or an operation asks for. Two shapes arrive here: 2.x requirements are
 * `{ name: scopes }` records, and 3.x requirements carry the scheme inline, so the name comes
 * from matching it against the registry. A scheme nobody declared keeps a derived name instead
 * of being dropped — it took someone effort to write it.
 */
export function securityNamesOf(
    requirements: unknown,
    schemes: Record<string, InteropSecurityScheme>,
): string[] {
    if (!Array.isArray(requirements)) {
        return [];
    }

    return requirements.flatMap((requirement, index) =>
        namesOfRequirement(requirement, schemes, index),
    );
}

function namesOfRequirement(
    requirement: unknown,
    schemes: Record<string, InteropSecurityScheme>,
    index: number,
): string[] {
    const anonymous = `anon-${String(index + 1)}`;

    if (requirement === null || typeof requirement !== 'object') {
        return [anonymous];
    }

    const entries = Object.entries(requirement);

    if (entries.length > 0 && entries.every(([, value]) => Array.isArray(value))) {
        return entries.map(([name]) => name);
    }

    const named = Object.entries(schemes).find(([, scheme]) => sameScheme(scheme, requirement));

    return [named === undefined ? anonymous : named[0]];
}

function sameScheme(scheme: InteropSecurityScheme, requirement: object): boolean {
    const clean = stripParserNotes(requirement);

    if (!isRecord(clean) || clean['type'] !== scheme.type) {
        return false;
    }

    const extras: Record<string, unknown> = { ...clean };

    delete extras['type'];

    return JSON.stringify(extras) === JSON.stringify(scheme.extras);
}

function rawAt(
    raw: Record<string, unknown>,
    first: string,
    second: string,
): Record<string, unknown> | undefined {
    const nested = raw[first];

    if (!isRecord(nested)) {
        return undefined;
    }

    const leaf = nested[second];

    return isRecord(leaf) ? leaf : undefined;
}
