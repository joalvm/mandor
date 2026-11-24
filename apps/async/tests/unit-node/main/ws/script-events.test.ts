import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    startEchoServer,
    type EchoServer,
} from '../../../../../../packages/transport-async/tests/support/echo-server.js';
import { waitFor } from '../../../../../../packages/transport-async/tests/support/wait-for.js';
import { startScriptSockets, type ScriptSockets } from './support/script-sockets.js';

// onConnect and onMessage on a real socket, against a server that echoes every frame back.

let sockets: ScriptSockets;
let echo: EchoServer;

function scripts(events: Record<string, string>) {
    return {
        scripts: Object.fromEntries(
            Object.entries(events).map(([event, source]) => [event, { source }]),
        ),
    };
}

async function openWith(events: Record<string, string>): Promise<void> {
    const answer = await sockets.open({
        transport: 'websocket',
        template: { url: echo.url },
        ...scripts(events),
    });

    expect(answer).toEqual({ ok: true, value: {} });
}

function sent(): string[] {
    return sockets
        .frames()
        .filter((record) => record.direction === 'out')
        .map((record) => record.data);
}

function arrived(): string[] {
    return sockets
        .frames()
        .filter((record) => record.direction === 'in')
        .map((record) => record.data);
}

function dropped(): number {
    return sockets.notes.reduce((sum, note) => sum + note.dropped, 0);
}

/** What main said of the runs, by its code. */
function notices(): string[] {
    return sockets.notes
        .flatMap((note) => note.logs)
        .flatMap((log) => ('notice' in log ? [log.notice] : []));
}

beforeEach(async () => {
    sockets = await startScriptSockets();
    echo = await startEchoServer();
});

afterEach(async () => {
    await sockets.stop();
    await echo.close();
});

describe('onConnect as the socket opens', () => {
    it('greets through the socket and says what it ran', async () => {
        await openWith({ onConnect: 'console.log("hi"); mandor.socket.send("hola");' });

        await waitFor(() => {
            expect(sent()).toEqual(['hola']);
        });
        await waitFor(() => {
            expect(sockets.notes).toEqual([
                expect.objectContaining({ event: 'onConnect', logs: [expect.anything()] }),
            ]);
        });
    });

    it('leaves the socket open when it fails, and says why', async () => {
        await openWith({ onConnect: 'throw new Error("no greeting");' });

        await waitFor(() => {
            expect(sockets.notes.at(0)?.error?.message).toContain('no greeting');
        });
        expect(sockets.states()).toEqual(['connecting', 'open']);
        expect(echo.clientCount()).toBe(1);
    });
});

describe('onMessage on each frame that arrives', () => {
    it('answers a ping with a pong', async () => {
        await openWith({
            onMessage: 'if (mandor.message.text === "ping") { mandor.socket.send("pong"); }',
        });
        echo.broadcastText('ping');

        await waitFor(() => {
            expect(sent()).toEqual(['pong']);
        });
    });

    it('reads bytes as bytes, with no text', async () => {
        await openWith({
            onMessage:
                'mandor.socket.send(String(mandor.message.binary) + ":" + String(mandor.message.text));',
        });
        echo.broadcastBinary(new Uint8Array([0, 1, 2]));

        await waitFor(() => {
            expect(sent()).toEqual(['true:undefined']);
        });
    });

    it('never holds the socket back in a flood, and counts what it dropped', async () => {
        await openWith({ onMessage: 'console.log(mandor.message.text);' });

        const rssBefore = process.memoryUsage().rss;

        for (let index = 0; index < 10_000; index += 1) {
            echo.broadcastText(`f${String(index)}`);
        }

        echo.broadcastText('last');

        await waitFor(() => {
            expect(arrived()).toContain('last');
        });
        // Flat, not exact: the queue holds at most `messageQueue` frames, whatever the flood.
        expect(process.memoryUsage().rss - rssBefore).toBeLessThan(64 * 1024 * 1024);
        await sockets.close();
        await waitFor(() => {
            expect(dropped()).toBeGreaterThan(0);
        });
        expect(notices()).toContain('queue-full');
    });

    it('cuts a loop of sends at the rate of the connection, and ends with the socket', async () => {
        // One send a second, two a frame: the first run already goes over, the rate never waits on
        // how fast a machine runs. Every frame comes back, so the loop goes on until the close.
        await sockets.stop();
        sockets = await startScriptSockets({ socketSendsPerSecond: 1 });
        await openWith({ onMessage: 'mandor.socket.send("again"); mandor.socket.send("again");' });
        echo.broadcastText('start');

        await waitFor(() => {
            expect(notices()).toContain('sends-dropped');
        });
        await sockets.close();

        await waitFor(() => {
            expect(echo.clientCount()).toBe(0);
        });
        expect(dropped()).toBeGreaterThan(0);
    });

    it('stops on the next frame once the switch of this machine is off', async () => {
        await openWith({
            onMessage: 'if (mandor.message.text === "ping") { mandor.socket.send("pong"); }',
        });
        echo.broadcastText('ping');
        await waitFor(() => {
            expect(sent()).toEqual(['pong']);
        });

        sockets.switchScripts(false);
        echo.broadcastText('ping');

        await waitFor(() => {
            expect(sockets.notes.some((note) => note.switchedOff > 0)).toBe(true);
        });
        expect(sent()).toEqual(['pong']);
    });
});
