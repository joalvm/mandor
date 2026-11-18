import type { Variable } from '@mandor/schema';

import { readGlobals } from './read-globals.js';
import { writeGlobals } from './write-globals.js';

/**
 * The variables already there as they are, then those of `incoming` whose name is not there, in
 * the order they came. A name the origin has keeps its value: an import adds, it never decides
 * over what a person set.
 */
export function mergeVariables(
    existing: readonly Variable[],
    incoming: readonly Variable[],
): Variable[] {
    const names = new Set(existing.map((variable) => variable.name));

    return [...existing, ...incoming.filter((variable) => !names.has(variable.name))];
}

/**
 * Adds to the globals of the origin the names an import brings that it does not have. Nothing is
 * written when every name is already there. Answers whether it wrote.
 */
export async function mergeImportedGlobals(
    root: string,
    incoming: readonly Variable[],
): Promise<boolean> {
    const { variables } = await readGlobals(root);
    const merged = mergeVariables(variables, incoming);

    if (merged.length === variables.length) {
        return false;
    }

    await writeGlobals(root, { variables: merged });

    return true;
}
