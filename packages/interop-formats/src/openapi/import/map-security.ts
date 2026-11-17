import { type InteropSecurityScheme, isRecord } from '@mandor/interop-core';

import { listAt, recordAt } from '../document/node-access.js';
import { unknownKeys } from '../document/unknown-keys.js';

/**
 * The security the document declares by name. The model keeps `type` apart because it says which
 * kind of credential Mandor is being asked for; the rest of the scheme rides as written, and the
 * workspace decides what to do with it.
 */
export function securitySchemesOf(
    components: Record<string, unknown>,
): Record<string, InteropSecurityScheme> {
    const schemes: Record<string, InteropSecurityScheme> = {};

    for (const [name, value] of Object.entries(recordAt(components, 'securitySchemes'))) {
        const type = isRecord(value) ? value['type'] : undefined;

        if (isRecord(value) && typeof type === 'string') {
            schemes[name] = { type, extras: unknownKeys(value, ['type']) };
        }
    }

    return schemes;
}

/** The names a list of requirements asks for, once each: `[{ a: [], b: [] }, { a: [] }]` is a and b. */
export function securityNamesOf(requirements: unknown): string[] {
    const names = (Array.isArray(requirements) ? requirements : []).flatMap((requirement) =>
        Object.keys(isRecord(requirement) ? requirement : {}),
    );

    return [...new Set(names)];
}

/** Null inherits what the document asks of everything; a list, even an empty one, is the operation's own. */
export function operationSecurityOf(operation: Record<string, unknown>): string[] | null {
    return 'security' in operation ? securityNamesOf(listAt(operation, 'security')) : null;
}
