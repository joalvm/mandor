import type { Environment } from '@mandor/schema';

import type { InteropServer, InteropServerVariable } from '../ir/interop-document.js';
import { urlProtocolOf } from '../ir/url-protocol.js';

/**
 * The environments as the servers a document offers, read the other way of what an import
 * writes: the `baseUrl` of the environment is the address, its `{{var}}` the placeholders the
 * document names, and no other variable travels — the rest are the person's values, and the
 * document never carries them. `reached` are the environments the cut left out of the workspace
 * but whose address the document still says.
 */
export function serversOfEnvironments(
    environments: readonly Environment[],
    reached: readonly Environment[] = [],
): InteropServer[] {
    const servers: InteropServer[] = [];
    const seen = new Map<string, number>();

    for (const environment of [...environments, ...reached]) {
        const baseUrl = environment.variables.find(
            (variable) => variable.name === 'baseUrl' && variable.enabled && variable.value !== '',
        );

        if (baseUrl === undefined) {
            continue;
        }

        servers.push({
            name: nameOf(environment, seen),
            url: baseUrl.value.replace(/\{\{([^{}]+)\}\}/gu, '{$1}'),
            protocol: urlProtocolOf(baseUrl.value),
            security: [],
            variables: variablesOf(baseUrl.value, environment),
            extras: {},
        });
    }

    return servers;
}

function nameOf(environment: Environment, seen: Map<string, number>): string {
    const count = (seen.get(environment.name) ?? 0) + 1;

    seen.set(environment.name, count);

    return count === 1 ? environment.name : `${environment.name} (${String(count)})`;
}

/** One variable per placeholder of the url, in the order the url names them. */
function variablesOf(url: string, environment: Environment): Record<string, InteropServerVariable> {
    const variables: Record<string, InteropServerVariable> = {};

    for (const match of url.matchAll(/\{\{([^{}]+)\}\}/gu)) {
        const name = match[1] ?? '';
        const value = environment.variables.find(
            (variable) => variable.name === name && variable.enabled && !variable.secret,
        );

        variables[name] = { default: value?.value ?? '' };
    }

    return variables;
}
