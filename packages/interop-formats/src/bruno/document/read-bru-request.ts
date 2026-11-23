import type { InteropFile } from '@mandor/interop-core';
import { bruRequestSchema, type BruRequest } from './bru-schema.js';
import type { BrunoNode, BrunoSkipped } from './bruno-tree.js';
import { stemOf } from './file-name.js';
import { leftOutOf } from './left-out-of.js';
import { sequenceOf } from './order-nodes.js';
import { parseValue } from './parse-value.js';
import { authOfBru } from './read-bru-auth.js';
import { bodyOfBru } from './read-bru-body.js';
import { examplesOfBru } from './read-bru-example.js';
import { paramsOfBru, rowsOfBru } from './read-bru-rows.js';
import { scriptsOfBru } from './read-bru-scripts.js';
import { websocketOfBru } from './read-bru-websocket.js';
import { requestBruOf } from './read-bru.js';
import { settingsOf } from './read-settings.js';

function leftOutOfRequest(request: BruRequest, unreadExamples: boolean): string[] {
    return leftOutOf({
        assertions: request.assertions,
        'request variables': request.vars,
        examples: unreadExamples,
    });
}

function placeOfRequest({ meta }: BruRequest): { tags: string[]; seq: number } {
    return { tags: meta?.tags ?? [], seq: sequenceOf(meta?.seq) };
}

function nodeOfRequest(request: BruRequest, name: string): BrunoNode {
    const { examples, unread } = examplesOfBru(request.examples);

    return {
        kind: 'request',
        ...placeOfRequest(request),
        name,
        method: (request.http?.method ?? 'GET').toUpperCase(),
        url: request.http?.url ?? '',
        description: request.docs ?? '',
        headers: rowsOfBru(request.headers),
        params: paramsOfBru(request.params, 'query'),
        pathParams: paramsOfBru(request.params, 'path'),
        body: bodyOfBru(request.http?.body, request.body),
        auth: authOfBru(request.http?.auth, request.auth),
        settings: settingsOf(request.settings),
        examples,
        scripts: scriptsOfBru(request.script, request.tests),
        leftOut: leftOutOfRequest(request, unread),
    };
}

/** The nodes `.bru` has for each kind of request it names; any other kind (gRPC…) is left out. */
const NODE_OF_KIND: Partial<Record<string, (request: BruRequest, name: string) => BrunoNode>> = {
    http: nodeOfRequest,
    graphql: nodeOfRequest,
    ws: websocketOfBru,
};

/** The request a `.bru` file holds; a file of another kind is named in `skipped` and gives none. */
export function requestOfBru(file: InteropFile, skipped: BrunoSkipped[]): BrunoNode[] {
    const request = parseValue(requestBruOf(file), file.path, bruRequestSchema);
    const name = request.meta?.name ?? stemOf(file.path);
    const kind = request.meta?.type ?? 'http';
    const nodeOf = NODE_OF_KIND[kind];

    if (nodeOf === undefined) {
        skipped.push({ kind, name });

        return [];
    }

    return [nodeOf(request, name)];
}
