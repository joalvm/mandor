import type { InteropDocument, InteropVariable } from '@mandor/interop-core';

/**
 * The variables of the workspace out of the globals of Postman, the only variables Postman puts
 * above a collection. The ones a collection declares are its own and Mandor has no place for
 * them: they are not made up into a workspace, and the `{{name}}` that uses them stays as text.
 * When two files of globals name one variable, the later wins; the order is the one they came in.
 */
export function globalsToVariables(globals: readonly InteropDocument[]): InteropVariable[] {
    const named = new Map<string, InteropVariable>();
    const declared = globals.flatMap((document) =>
        (document.environments ?? []).flatMap((environment) => environment.variables),
    );

    for (const variable of declared) {
        named.set(variable.name, variable);
    }

    return [...named.values()];
}
