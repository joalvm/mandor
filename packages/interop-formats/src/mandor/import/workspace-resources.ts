import {
    degradation,
    environmentFingerprint,
    fingerprintOf,
    type ImportResource,
    workspaceFingerprint,
} from '@mandor/interop-core';
import {
    docTitle,
    spreadIntoEnvironments,
    type Connection,
    type Environment,
    type Variable,
    type WorkspaceBundle,
} from '@mandor/schema';

import { mandorOrigin } from './mandor-origin.js';

/** A bundle never brings a secret in: whatever a hand-edited file puts in one enters empty. */
function variableOf(variable: Variable): Variable {
    return { ...variable, value: variable.secret ? '' : variable.value };
}

function settingsOf(bundle: WorkspaceBundle, sourceId: string): ImportResource[] {
    const { auth, name } = bundle.workspace;
    const fields: Record<string, unknown> = auth === undefined ? {} : { auth };

    if (Object.keys(fields).length === 0) {
        return [];
    }

    return [
        {
            place: 'workspace',
            itemKind: null,
            route: '.',
            name,
            fields,
            origin: mandorOrigin(sourceId, workspaceFingerprint({ auth })),
            degradations: [],
        },
    ];
}

function environmentOf(environment: Environment, sourceId: string): ImportResource {
    const variables = environment.variables.map(variableOf);

    return {
        place: 'environment',
        itemKind: null,
        route: environment.id,
        name: environment.name,
        fields: { name: environment.name, variables },
        origin: mandorOrigin(
            sourceId,
            environmentFingerprint({ name: environment.name, variables }),
        ),
        degradations: variables
            .filter((variable) => variable.secret)
            .map((variable) =>
                degradation('secretEntersEmptyEnvironment', { name: variable.name }),
            ),
    };
}

function connectionOf(connection: Connection, sourceId: string): ImportResource {
    const owned = {
        name: connection.name,
        url: connection.url,
        transport: connection.transport,
        headers: connection.headers,
    };

    return {
        place: 'connection',
        itemKind: null,
        route: connection.id,
        name: connection.name,
        // The origin of a file is not the connection's own: this import is the one that claims it.
        fields: Object.fromEntries(Object.entries(connection).filter(([key]) => key !== 'origin')),
        origin: mandorOrigin(sourceId, fingerprintOf(owned)),
        degradations: [],
    };
}

function docOf(
    doc: { name: string; title?: string | undefined; text: string },
    sourceId: string,
): ImportResource {
    return {
        place: 'doc',
        itemKind: null,
        route: doc.name,
        name: doc.title ?? docTitle(doc.name),
        fields: { text: doc.text },
        origin: mandorOrigin(sourceId, fingerprintOf({ text: doc.text })),
        degradations: [],
    };
}

/** What lives above the collections: the workspace file, environments, connections and notes. */
/**
 * The environments of the bundle, with the variables an older bundle kept on its workspace spread
 * into them the way a migrated origin has them: each environment gets the names it lacked, and
 * `Base` is born with them all. The level they sat on no longer exists.
 */
function environmentsOf(bundle: WorkspaceBundle): Environment[] {
    const variables = bundle.workspace.variables;

    if (variables.length === 0) {
        return bundle.environments;
    }

    const taken = new Set(bundle.environments.map((environment) => environment.id));
    const base = { id: taken.has(BASE_ID) ? `${BASE_ID}-workspace` : BASE_ID, name: BASE_NAME };
    const spread = spreadIntoEnvironments(variables, bundle.environments, base);

    return [spread.base, ...spread.environments];
}

const BASE_ID = 'base';
const BASE_NAME = 'Base';

export function workspaceResourcesOf(bundle: WorkspaceBundle, sourceId: string): ImportResource[] {
    return [
        ...settingsOf(bundle, sourceId),
        ...environmentsOf(bundle).map((environment) => environmentOf(environment, sourceId)),
        ...bundle.connections.map((connection) => connectionOf(connection, sourceId)),
        ...bundle.docs.map((doc) => docOf(doc, sourceId)),
    ];
}
