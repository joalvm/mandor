import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    startEchoServer,
    type EchoServer,
} from '../../../../../../packages/transport-async/tests/support/echo-server.js';
import {
    startSocketIoServer,
    type SocketIoServer,
} from '../../../../../../packages/transport-async/tests/support/socketio-server.js';
import { SECRET, startScriptSockets, type ScriptSockets } from './support/script-sockets.js';

// The rule of destination over a real handshake: what reaches a server on this machine.

let sockets: ScriptSockets;
let echo: EchoServer;
let other: EchoServer;

const MINE = { Authorization: 'Bearer {{token}}' };

function before(source: string) {
    return { scripts: { onBeforeConnect: { source } } };
}

/** The host and port of a server, for a url the IPC takes: the scheme stays written. */
function hostOf(server: EchoServer) {
    return new URL(server.url).host;
}

/** How the note of `onBeforeConnect` said the handshake went out. */
function saidOff() {
    const note = sockets.notes.find((each) => each.event === 'onBeforeConnect');

    return { secretsOff: note?.secretsOff, withheld: note?.withheld };
}

function websocket(source: string, headers: Record<string, string> = MINE) {
    return { transport: 'websocket', template: { url: echo.url, headers }, ...before(source) };
}

beforeEach(async () => {
    sockets = await startScriptSockets();
    echo = await startEchoServer();
    other = await startEchoServer();
});

afterEach(async () => {
    await sockets.stop();
    await echo.close();
    await other.close();
});

describe('a websocket whose script shaped the handshake', () => {
    it('sends the secret of the person when the script only set a value', async () => {
        await expect(sockets.open(websocket('vars.set("a", "1");'))).resolves.toMatchObject({
            ok: true,
        });

        expect(echo.lastHeaders()['authorization']).toBe(`Bearer ${SECRET}`);
        expect(saidOff()).toEqual({ secretsOff: undefined, withheld: [] });
    });

    it('sends the secret of the person when the script touched the query of the same origin', async () => {
        await sockets.open(websocket('request.query.set("page", "2");'));

        expect(echo.lastHeaders()['authorization']).toBe(`Bearer ${SECRET}`);
    });

    it('never fills a secret into a header the script wrote', async () => {
        await sockets.open(websocket('request.headers.set("X-Key", "{{token}}");'));

        expect(echo.lastHeaders()['x-key']).toBe('{{token}}');
        expect(echo.lastHeaders()['authorization']).toBe(`Bearer ${SECRET}`);
    });

    it('sends no secret to the server a script moved the socket to', async () => {
        await sockets.open(websocket(`request.url = "${other.url}";`));

        expect(echo.clientCount()).toBe(0);
        expect(other.lastHeaders()['authorization']).toBe('Bearer {{token}}');
        expect(saidOff()).toEqual({ secretsOff: 'destination', withheld: ['token'] });
    });

    it('sends no secret when a script wrote the Host line', async () => {
        await sockets.open(websocket('request.headers.set("Host", "elsewhere.example");'));

        expect(echo.lastHeaders()['host']).toBe('elsewhere.example');
        expect(echo.lastHeaders()['authorization']).toBe('Bearer {{token}}');
    });

    /** What a script set outlives its run: an open that skips the scripts still goes there. */
    it('keeps the rule for an open that runs no script, while a value of a script stands', async () => {
        await sockets.variable('target', hostOf(echo));

        const first = await sockets.open({
            transport: 'websocket',
            template: { url: 'ws://{{target}}', headers: MINE },
            ...before(`vars.set("target", "${hostOf(other)}");`),
        });

        expect(first).toEqual({ ok: true, value: {} });
        expect(other.lastHeaders()['authorization']).toBe('Bearer {{token}}');
        await sockets.close();

        const again = await sockets.open({
            transport: 'websocket',
            template: { url: 'ws://{{target}}', headers: { 'X-Again': '{{token}}' } },
            skipScripts: true,
        });

        expect(again).toEqual({ ok: true, value: {} });
        expect(echo.clientCount()).toBe(0);
        expect(other.lastHeaders()['x-again']).toBe('{{token}}');
    });
});

describe('a Socket.IO whose script shaped the handshake', () => {
    let io: SocketIoServer;

    beforeEach(async () => {
        io = await startSocketIoServer();
    });

    afterEach(async () => {
        await io.close();
    });

    function socketio(source: string, engineTransport?: string) {
        return {
            transport: 'socketio',
            template: { url: io.url, headers: MINE },
            ...(engineTransport === undefined ? {} : { socketio: { engineTransport } }),
            ...before(source),
        };
    }

    /** Polling follows a redirect with every header: a script that shaped it sends no secret. */
    it('sends no secret when it may poll', async () => {
        await sockets.open(socketio('request.headers.set("X-Run", "1");', 'polling-then-upgrade'));

        expect(io.lastHandshake()?.headers['authorization']).toBe('Bearer {{token}}');
        expect(saidOff()).toEqual({ secretsOff: 'polling', withheld: ['token'] });
    });

    it('takes the default of the client, which polls, as polling', async () => {
        await sockets.open(socketio('request.headers.set("X-Run", "1");'));

        expect(io.lastHandshake()?.headers['authorization']).toBe('Bearer {{token}}');
    });

    it('sends the secret over websocket alone, on the same origin', async () => {
        await sockets.open(socketio('request.headers.set("X-Run", "1");', 'websocket-only'));

        expect(io.lastHandshake()?.headers['authorization']).toBe(`Bearer ${SECRET}`);
    });

    it('sends no secret when a script wrote the Host line, over websocket alone too', async () => {
        await sockets.open(
            socketio('request.headers.set("Host", "elsewhere.example");', 'websocket-only'),
        );

        expect(io.lastHandshake()?.headers['authorization']).toBe('Bearer {{token}}');
    });
});
