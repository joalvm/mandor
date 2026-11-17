import {
    environmentFingerprint,
    type ImportResource,
    type InteropDocument,
    type InteropServer,
} from '@mandor/interop-core';
import type { Variable } from '@mandor/schema';

import { authOfScheme } from './auth-of-scheme.js';
import { routeOf } from './route-of.js';
import { workspaceAuthOf } from './workspace-auth.js';

const NO_SERVER: InteropServer = {
    name: 'default',
    url: '',
    protocol: 'http',
    security: [],
    variables: {},
    extras: {},
};

/**
 * One environment per server the document offers: the address as `baseUrl`, a variable for each
 * `{name}` the address takes, and an empty one for each thing the auth will ask for, so the person
 * sees what is left to fill. No variable is secret: the mark is the person's to put.
 */
export function environmentResourcesOf(document: InteropDocument): ImportResource[] {
    const servers = document.servers.length === 0 ? [NO_SERVER] : document.servers;
    const asked = authVariablesOf(document);
    const routes: string[] = [];

    return servers.map((server) => {
        const route = routeOf(server.name, routes);
        const variables = variablesOf(server, asked);

        routes.push(route);

        return {
            place: 'environment',
            itemKind: null,
            route,
            name: server.name,
            fields: { name: server.name, variables },
            origin: {
                kind: 'openapi',
                sourceId: document.sourceId,
                fingerprint: environmentFingerprint({ name: server.name, variables }),
            },
            degradations: [],
        };
    });
}

function variablesOf(server: InteropServer, asked: readonly string[]): Variable[] {
    const entries: [string, string][] = [
        ['baseUrl', server.url.replace(/\{([^{}]+)\}/gu, '{{$1}}')],
        ...Object.entries(server.variables).map(([name, variable]): [string, string] => [
            name,
            variable.default,
        ]),
        ...asked.map((name): [string, string] => [name, '']),
    ];
    const unique = entries.filter(
        ([name], index) => entries.findIndex(([each]) => each === name) === index,
    );

    return unique.map(([name, value]) => ({ name, value, enabled: true, secret: false }));
}

/** What every scheme Mandor can hold asks the person for, the workspace's own scheme first. */
function authVariablesOf(document: InteropDocument): string[] {
    const first = workspaceAuthOf(document);
    const mappings = [
        ...(first === undefined ? [] : [first.mapping]),
        ...Object.values(document.security).map(authOfScheme),
    ];

    return mappings.flatMap((mapping) => ('variables' in mapping ? mapping.variables : []));
}
