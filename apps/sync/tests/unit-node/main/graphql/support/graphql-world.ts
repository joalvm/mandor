import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
    closeRepo,
    forgetSecrets,
    openRepo,
    redactingIpc,
    spyIpc,
    type IpcSpy,
} from '@mandor/host/testing';
import { createEnvironment, createRequestItem } from '@mandor/schema';
import { createWorkspace, writeRepoTree, writeEnvironment } from '@mandor/store-fs';
import { buildSchema, graphqlSync } from 'graphql';
import { afterEach, beforeEach } from 'vitest';

import { registerGraphqlHandlers } from '../../../../../src/main/graphql/graphql.handlers.js';
import { MAX_SCHEMA_BYTES } from '../../../../../src/main/graphql/introspection-of.js';

const SCHEMA = buildSchema('type Query { ping: String }');

type Seen = { method: string; url: string; body: string; type: string | undefined };

/** What a test of the graphql channels stands on: a repo, a server to ask and the handlers. */
export type GraphqlWorld = {
    dispose: () => void;
    ipc: IpcSpy;
    origin: string;
    root: string;
    /** What reached the server, in order. */
    seen: Seen[];
    server: Server;
};

function answer(
    request: IncomingMessage,
    body: string,
    send: (status: number, text: string) => void,
) {
    if (request.url === '/slow') {
        return;
    }

    if (request.url === '/denied') {
        send(400, JSON.stringify({ errors: [{ message: 'introspection is disabled' }] }));
    } else if (request.url === '/page') {
        send(200, '<html>not graphql</html>');
    } else if (request.url === '/huge') {
        send(200, ' '.repeat(MAX_SCHEMA_BYTES + 1));
    } else {
        const { query } = JSON.parse(body) as { query: string };

        send(200, JSON.stringify(graphqlSync({ schema: SCHEMA, source: query })));
    }
}

/** The input of both channels, for the item `api/schema` of the workspace `payments`. */
export function payload(
    url: string,
    request: Record<string, unknown> = {},
    environmentId: string | null = 'local',
) {
    return {
        workspaceId: 'payments',
        itemPath: 'api/schema',
        environmentId,
        request: { ...createRequestItem({ name: 'Schema' }), url, ...request },
    };
}

function serve(seen: Seen[]): Server {
    return createServer((request, response) => {
        const chunks: Buffer[] = [];

        request.on('data', (chunk: Buffer) => chunks.push(chunk));
        request.on('end', () => {
            const body = Buffer.concat(chunks).toString('utf8');

            seen.push({
                method: request.method ?? '',
                url: request.url ?? '',
                body,
                type: request.headers['content-type'],
            });
            answer(request, body, (status, text) => {
                response.writeHead(status, { 'content-type': 'application/json' });
                response.end(text);
            });
        });
    });
}

/** Sets the world up before each test and takes it down after; the object is refilled each time. */
export function useGraphqlWorld(): GraphqlWorld {
    const world = {} as GraphqlWorld;

    beforeEach(async () => {
        world.root = await mkdtemp(join(tmpdir(), 'mandor-graphql-handlers-'));
        world.seen = [];
        world.server = serve(world.seen);
        await new Promise<void>((resolve) => world.server.listen(0, '127.0.0.1', resolve));
        world.origin = `http://127.0.0.1:${String((world.server.address() as AddressInfo).port)}`;
        await writeRepoTree(world.root, 'Demo');
        await createWorkspace(world.root, { id: 'payments', name: 'Payments', kind: 'sync' });
        await writeEnvironment(
            world.root,
            'payments',
            createEnvironment({
                id: 'local',
                name: 'Local',
                variables: [{ name: 'baseUrl', value: world.origin, enabled: true, secret: false }],
            }),
        );
        openRepo(world.root);
        world.ipc = spyIpc();
        world.dispose = registerGraphqlHandlers(redactingIpc(world.ipc), {
            readSecret: () => Promise.resolve(null),
            networkFor: () => Promise.resolve({ tls: {} }),
        });
    });

    afterEach(async () => {
        world.dispose();
        closeRepo();
        forgetSecrets();
        world.server.closeAllConnections();
        await new Promise((resolve) => world.server.close(resolve));
        await rm(world.root, { recursive: true, force: true });
    });

    return world;
}
