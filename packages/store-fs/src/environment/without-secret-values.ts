import type { Variable } from '@mandor/schema';

/** Whatever keeps a list of variables in a file that travels: an environment, or the globals. */
type WithVariables = { variables: Variable[] };

/**
 * The environment as the file is allowed to hold it. A secret keeps its name and its mark and
 * loses its value, and a variable that **was** secret loses it too: unmarking the box is not a
 * way to walk a token back into a file that travels to the origin of the user.
 *
 * This is the last thing that happens before a write and it happens here, in the only module
 * that writes, so a caller cannot leak a value by forgetting to ask.
 */
export function withoutSecretValues<T extends WithVariables>(
    next: T,
    previous: WithVariables | null,
): T {
    return { ...next, variables: next.variables.map((variable) => kept(variable, previous)) };
}

function kept(variable: Variable, previous: WithVariables | null): Variable {
    if (variable.secret || wasSecret(variable.name, previous)) {
        return { ...variable, value: '' };
    }

    return variable;
}

function wasSecret(name: string, previous: WithVariables | null): boolean {
    const before = previous?.variables.find((variable) => variable.name === name);

    return before?.secret === true;
}
