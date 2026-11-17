import { mkdtemp, rm } from 'node:fs/promises';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { closeRepo, forgetSecrets, noScripts, openRepo } from '@mandor/host/testing';
import type { RequestScriptOutput, RequestSendRequest } from '@mandor/ipc';
import { createEnvironment, createRequestItem, type Variable } from '@mandor/schema';
import { createWorkspace, writeRepoTree, writeEnvironment } from '@mandor/store-fs';

import {
    createCookieJarStore,
    type CookieJarStore,
} from '../../../../../src/main/cookies/cookie-jar-store.js';
import type { SendScripts } from '../../../../../src/main/request/request-scripts.js';
import { responsesInFlight } from '../../../../../src/main/request/responses-in-flight.js';
import type { SentRequest } from '../../../../../src/main/request/send-event.js';
import { runSend, type Inflight } from '../../../../../src/main/request/run-send.js';

export const SECRET = 'tok_sync_secret_value';
export const BIG = Buffer.alloc(1_500_000, 97);

/** What a send carries beside the request: the id a cancel names, and whether scripts run. */
type SendOptions = Partial<Pick<RequestSendRequest, 'sendId' | 'skipScripts'>>;

type Received = {
    method: string;
    url: string;
    headers: IncomingMessage['headers'];
    body: string;
};

/** Answers a request the fixture's own routes do not: true when it did. */
type Route = (request: IncomingMessage, response: ServerResponse, body: string) => boolean;

/** What a test adds to the fixture: routes of its own and variables of the environment. */
type FixtureOptions = { route?: Route; variables?: Variable[] };

/** A local server, a repo with an environment pointing at it, and the sends made against it. */
export type SendFixture = {
    root: string;
    origin: string;
    received: Received[];
    inflight: Inflight;
    cookieJars: CookieJarStore;
    /** What left on each send, as the history is told. */
    sends: (SentRequest | undefined)[];
    proxied: string[];
    /** What main wrote down while sending: the log of the app. */
    lines: [string, string][];
    /** What the window was told the scripts of each phase said. */
    told: RequestScriptOutput[];
    /** Runs `watch` inside the watcher of every send from now on, before it answers. */
    whileWatched: (watch: () => Promise<void>) => void;
    payload: (request: Partial<RequestSendRequest['request']>, options?: SendOptions) => unknown;
    send: (
        request: Partial<RequestSendRequest['request']>,
        options?: SendOptions,
    ) => ReturnType<typeof runSend>;
    stop: () => Promise<void>;
};

function answer(request: IncomingMessage, response: ServerResponse, body: string): void {
    if (request.url === '/big') {
        response.writeHead(200, { 'content-type': 'application/octet-stream' });
        response.end(BIG);
    } else if (request.url === '/binary') {
        response.writeHead(200, { 'content-type': 'application/octet-stream' });
        response.end(Buffer.from([0xff, 0xfe, 0x00, 0x80]));
    } else if (request.url === '/login') {
        response.writeHead(302, { location: '/echo', 'set-cookie': 'sid=abc; Path=/' });
        response.end();
    } else if (request.url === '/digest' && request.headers.authorization === undefined) {
        response.writeHead(401, { 'www-authenticate': 'Digest realm="r", nonce="n", qop="auth"' });
        response.end();
    } else if (request.url === '/redirect') {
        response.writeHead(302, { location: '/echo' });
        response.end();
    } else if (request.url !== '/slow') {
        // `/slow` never answers: the test ends it.
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ method: request.method, headers: request.headers, body }));
    }
}

/** The scripts a send runs with: by default, none is approved and no worker ever starts. */
type FixtureScripts = Pick<SendScripts, 'scripts' | 'scriptVariables'>;

export async function startSendFixture(
    scripts: FixtureScripts = noScripts(),
    options: FixtureOptions = {},
): Promise<SendFixture> {
    const root = await mkdtemp(join(tmpdir(), 'mandor-run-send-'));
    const received: Received[] = [];
    const inflight: Inflight = new Map();
    const proxied: string[] = [];
    const server: Server = createServer((request, response) => {
        const chunks: Buffer[] = [];

        request.on('data', (chunk: Buffer) => chunks.push(chunk));
        request.on('end', () => {
            const body = Buffer.concat(chunks).toString('utf8');

            received.push({
                method: request.method ?? '',
                url: request.url ?? '',
                headers: request.headers,
                body,
            });

            if (options.route?.(request, response, body) !== true) {
                answer(request, response, body);
            }
        });
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

    const origin = `http://127.0.0.1:${String((server.address() as AddressInfo).port)}`;

    await writeRepoTree(root, 'Demo');
    await createWorkspace(root, { id: 'payments', name: 'Payments', kind: 'sync' });
    await writeEnvironment(
        root,
        'payments',
        createEnvironment({
            id: 'local',
            name: 'Local',
            variables: [
                { name: 'baseUrl', value: origin, enabled: true, secret: false },
                { name: 'token', value: '', enabled: true, secret: true },
                ...(options.variables ?? []),
            ],
        }),
    );
    openRepo(root);

    const payload: SendFixture['payload'] = (request, options = {}) => ({
        sendId: options.sendId ?? crypto.randomUUID(),
        ...(options.skipScripts === undefined ? {} : { skipScripts: options.skipScripts }),
        workspaceId: 'payments',
        itemPath: 'orders/list',
        environmentId: 'local',
        request: { ...createRequestItem({ name: 'Echo' }), ...request },
    });
    const cookieJars = createCookieJarStore();
    const sends: (SentRequest | undefined)[] = [];
    const lines: [string, string][] = [];
    const told: RequestScriptOutput[] = [];
    let watch: () => Promise<void> = () => Promise.resolve();
    const deps = {
        cookieJars,
        afterSend: (event: { sent: SentRequest | undefined }) => {
            sends.push(event.sent);

            return watch();
        },
        readSecret: () => Promise.resolve(SECRET),
        networkFor: (url: string) => {
            proxied.push(url);

            return Promise.resolve({ tls: {} });
        },
        ...scripts,
        inFlight: responsesInFlight(),
        tell: (output: RequestScriptOutput) => {
            told.push(output);
        },
        logger: {
            log: (level: string, message: string) => {
                lines.push([level, message]);
            },
        },
    };

    return {
        root,
        origin,
        received,
        inflight,
        cookieJars,
        sends,
        proxied,
        lines,
        told,
        whileWatched: (next) => {
            watch = next;
        },
        payload,
        send: (request, options) => runSend(deps, inflight, payload(request, options)),
        stop: async () => {
            closeRepo();
            forgetSecrets();
            server.closeAllConnections();
            await new Promise((resolve) => server.close(resolve));
            await rm(root, { recursive: true, force: true });
        },
    };
}
