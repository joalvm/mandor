import { claimStem, type FormatDocument, type FormatFile } from '@mandor/interop-core';
import type { Environment, Variable } from '@mandor/schema';

/** The directory Bruno keeps the environments of a collection in. */
export const ENVIRONMENTS_DIR = 'environments';

function offOf(variable: Variable): FormatDocument {
    return variable.enabled ? {} : { disabled: true };
}

function named(variables: readonly Variable[]): Variable[] {
    return variables.filter((variable) => variable.name !== '');
}

/** A variable as an environment of Bruno lists it. A secret leaves with its name and no value. */
function environmentVariableOf(variable: Variable): FormatDocument {
    return {
        name: variable.name,
        ...(variable.secret ? { secret: true } : { value: variable.value }),
        ...offOf(variable),
    };
}

/**
 * The variables a collection or a folder asks of every request, which is where those of the
 * workspace go. Only an environment can mark a secret: here one is a name with no value.
 */
export function variableDocumentsOf(variables: readonly Variable[]): FormatDocument[] {
    return named(variables).map((variable) => ({
        name: variable.name,
        ...(variable.secret ? {} : { value: variable.value }),
        ...offOf(variable),
    }));
}

/** One file per environment of the workspace, in `environments/`, named after it. */
export function environmentFilesOf(environments: readonly Environment[]): FormatFile[] {
    const taken: string[] = [];

    return environments.map((environment) => ({
        path: `${ENVIRONMENTS_DIR}/${claimStem(environment.name, taken, 'environment')}.yml`,
        document: {
            name: environment.name,
            variables: named(environment.variables).map(environmentVariableOf),
        },
    }));
}
