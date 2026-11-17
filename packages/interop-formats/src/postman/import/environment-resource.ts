import {
    distinct,
    environmentFingerprint,
    type ImportResource,
    type InteropDocument,
    slugFor,
    variablesOf,
} from '@mandor/interop-core';

import { withDynamicFields } from './dynamic-variables.js';
import { originOf } from './origin-of.js';

/**
 * The environment a file of Postman is: its variables, apart from any request. The globals are
 * not one: they are the variables of the workspace, and the reading of the files merges them
 * there. A secret enters empty and marked secret, so the person fills it in where it stays out
 * of the repo.
 */
export function environmentResourceOf(document: InteropDocument): ImportResource | undefined {
    const environment = document.environments?.[0];

    if (environment === undefined) {
        return undefined;
    }

    const variables = variablesOf(environment.variables, 'environment');
    const mapped = withDynamicFields({ name: environment.name, variables: variables.variables });
    const fingerprint = environmentFingerprint({
        name: environment.name,
        variables: variables.variables,
    });

    return {
        place: 'environment',
        itemKind: null,
        route: slugFor(environment.name, [], 'environment'),
        name: environment.name,
        fields: mapped.fields,
        origin: originOf(document.sourceId, fingerprint),
        degradations: distinct([...variables.degradations, ...mapped.notes]),
    };
}
