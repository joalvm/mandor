import type { FormatDocument } from '@mandor/interop-core';
import type { Environment, Variable } from '@mandor/schema';

import { insomniaIdOf } from './insomnia-id.js';
import { withReferences } from './reference-of.js';

/**
 * The variables as the free JSON of an environment of Insomnia: a name and its value. A secret
 * leaves empty. Insomnia cannot switch a variable off, so one that is off does not leave.
 */
export function dataOf(variables: readonly Variable[]): FormatDocument {
    return withReferences(
        Object.fromEntries(
            variables
                .filter((variable) => variable.enabled)
                .map((variable) => [variable.name, variable.secret ? '' : variable.value]),
        ),
    );
}

function environmentOf(
    name: string,
    where: readonly string[],
    variables: readonly Variable[],
): FormatDocument {
    return {
        name,
        meta: { id: insomniaIdOf('env', ...where), isPrivate: false },
        data: dataOf(variables),
    };
}

/**
 * The `environments` of a collection: the variables of the workspace are the base environment,
 * which every other one inherits from, and each environment of the workspace is a sub one.
 * Nothing is written when the workspace has neither.
 */
export function environmentsDocumentOf(
    collection: string,
    variables: readonly Variable[],
    environments: readonly Environment[],
): FormatDocument | undefined {
    if (variables.length === 0 && environments.length === 0) {
        return undefined;
    }

    return {
        ...environmentOf('Base Environment', [collection, 'base'], variables),
        subEnvironments: environments.map((environment) =>
            environmentOf(
                environment.name,
                [collection, 'sub', environment.id],
                environment.variables,
            ),
        ),
    };
}
