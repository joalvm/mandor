import {
    type InteropServer,
    type InteropServerVariable,
    isRecord,
    urlProtocolOf,
} from '@mandor/interop-core';

import { asRecord, firstText, listAt, recordAt, textAt } from '../document/node-access.js';
import { unknownKeys } from '../document/unknown-keys.js';

const KNOWN = ['url', 'description', 'variables'];

/** One entry per server the document offers; a workspace gets one environment for each. */
export function serversOf(document: Record<string, unknown>): InteropServer[] {
    const taken = new Set<string>();

    return listAt(document, 'servers')
        .filter(isRecord)
        .map((server) => serverOf(server, taken));
}

function serverOf(server: Record<string, unknown>, taken: Set<string>): InteropServer {
    const url = String(server['url']);

    return {
        name: uniqueName(firstText(server['description']) ?? url, taken),
        url,
        protocol: urlProtocolOf(url),
        security: [],
        variables: variablesOf(recordAt(server, 'variables')),
        extras: unknownKeys(server, KNOWN),
    };
}

/** Operations point at servers by name, so two servers never share one. */
function uniqueName(base: string, taken: Set<string>): string {
    let name = base;

    for (let count = 2; taken.has(name); count += 1) {
        name = `${base} (${String(count)})`;
    }

    taken.add(name);

    return name;
}

function variablesOf(variables: Record<string, unknown>): Record<string, InteropServerVariable> {
    return Object.fromEntries(
        Object.entries(variables).map(([name, value]) => [name, variableOf(asRecord(value))]),
    );
}

function variableOf(variable: Record<string, unknown>): InteropServerVariable {
    const values = variable['enum'];

    return {
        default: String(variable['default']),
        enum: Array.isArray(values) ? values.map(String) : undefined,
        description: textAt(variable, 'description'),
    };
}
