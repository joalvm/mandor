import {
    distinct,
    fingerprintOf,
    variablesOf,
    type ImportResource,
    type InteropDocument,
} from '@mandor/interop-core';

import { globalsToVariables } from './globals-to-variables.js';
import { originOf } from './origin-of.js';

/**
 * The globals files of Postman as the globals of the origin, where Mandor keeps the same thing:
 * an environment that is always active. A secret keeps its name and mark and leaves its value
 * out. Writing them adds the names the origin lacks and keeps every value it already has.
 */
export function globalsResourceOf(globals: readonly InteropDocument[]): ImportResource | undefined {
    const first = globals[0];
    const declared = globalsToVariables(globals);

    if (first === undefined || declared.length === 0) {
        return undefined;
    }

    const mapped = variablesOf(declared, 'globals');

    return {
        place: 'globals',
        itemKind: null,
        route: '.',
        name: first.name,
        fields: { variables: mapped.variables },
        origin: originOf(first.sourceId, fingerprintOf({ variables: mapped.variables })),
        degradations: distinct(mapped.degradations),
    };
}
