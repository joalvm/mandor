import type { PlainVariable, Variable } from '@mandor/schema';

/**
 * The variables a collection leaves with in a format that has no globals: its own and the globals,
 * one per name, and the collection wins, the same as when Mandor resolves them.
 */
export function variablesOverGlobals(
    own: readonly PlainVariable[],
    globals: readonly Variable[],
): Variable[] {
    const names = new Set(own.map((variable) => variable.name));

    return [...own, ...globals.filter((variable) => !names.has(variable.name))];
}
