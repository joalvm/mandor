import {
    environmentResources,
    variablesOf,
    type ImportResource,
    type InteropVariable,
} from '@mandor/interop-core';

import type { BrunoDocument, BrunoVariable } from '../document/bruno-tree.js';
import { originOf } from './origin-of.js';

/** The variables as the core reads them; the first to name a variable keeps it. */
export function interopVariablesOf(
    lists: readonly (readonly BrunoVariable[])[],
): InteropVariable[] {
    const named = new Map<string, BrunoVariable>();

    for (const variable of lists.flat()) {
        if (!named.has(variable.name)) {
            named.set(variable.name, variable);
        }
    }

    return [...named.values()].map((variable) => ({
        name: variable.name,
        value: variable.value,
        enabled: !variable.disabled,
        secret: variable.secret,
    }));
}

/**
 * What the collections say of the workspace as a whole: its environments. The auth and the
 * variables of a collection are its own: the workspace reaches every collection, so what one says
 * would be sent by the others.
 */
export function workspaceResourcesOf(documents: readonly BrunoDocument[]): ImportResource[] {
    return environmentResources(documents, {
        variablesOf: (group) =>
            variablesOf(interopVariablesOf(group.map(({ variables }) => variables)), 'environment'),
        originOf,
    });
}
