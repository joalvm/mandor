import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createEnvironment, type ConnectionScripts } from '@mandor/schema';
import { createWorkspace, writeEnvironment, writeRepoTree } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    newSendRate,
    runConnectionEvent,
    type EventRun,
    type IncomingFrame,
} from '../../../../src/main/ws/connection-scripts.js';
import type { OpenedSocket } from '../../../../src/main/ws/open-socket.js';
import type { SocketSendRequest } from '../../../../src/main/ws/socket-manager.js';

import { approvedScripts } from './support/approved-scripts.js';

// The scripts that run while a socket lives, on the engine itself, against a socket double.

let root: string;
let sent: SocketSendRequest[];
let opened: Map<string, OpenedSocket>;

function socketWith(
    scripts: ConnectionScripts,
    transport: OpenedSocket['transport'] = 'websocket',
): OpenedSocket {
    const socket: OpenedSocket = {
        environmentId: 'local',
        transport,
        workspaceId: 'payments',
        scripts,
        secretsOff: null,
        place: {
            root,
            repo: 'local',
            readSecret: (key) =>
                Promise.resolve(key === 'local/payments/local/token' ? 'tok_abcdefgh' : null),
        },
    };

    opened.set('echo', socket);

    return socket;
}

function onMessage(source: string, transport?: OpenedSocket['transport']): OpenedSocket {
    return socketWith({ onMessage: { source } }, transport);
}

function frame(text: string | undefined, changes: Partial<IncomingFrame> = {}): IncomingFrame {
    return { text, binary: false, ...changes };
}

function run(socket: OpenedSocket, changes: Partial<EventRun> = {}, deps = approvedScripts()) {
    return runConnectionEvent(
        {
            ...deps,
            opened,
            send: (request) => {
                sent.push(request);

                return Promise.resolve();
            },
        },
        {
            connectionId: 'echo',
            socket,
            event: 'onMessage',
            frame: frame('ping'),
            rate: newSendRate(),
            signal: new AbortController().signal,
            ...changes,
        },
    );
}

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-connection-events-'));
    sent = [];
    opened = new Map();
    await writeRepoTree(root, 'Demo');
    await createWorkspace(root, { id: 'payments', name: 'Payments', kind: 'async' });
    await writeEnvironment(
        root,
        'payments',
        createEnvironment({
            id: 'local',
            name: 'Local',
            variables: [
                { name: 'token', value: '', enabled: true, secret: true },
                { name: 'who', value: 'web', enabled: true, secret: false },
            ],
        }),
    );
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('an onMessage on the frame that arrived', () => {
    it('reads the frame and answers through the socket it ran for', async () => {
        const note = await run(onMessage('if (message.text === "ping") { socket.send("pong"); }'));

        expect(sent).toEqual([{ connectionId: 'echo', data: 'pong' }]);
        expect(note).toMatchObject({ event: 'onMessage', dropped: 0, switchedOff: 0 });
    });

    it('reads bytes as bytes, with no text', async () => {
        await run(onMessage('socket.send(String(message.binary) + ":" + String(message.text));'), {
            frame: frame(undefined, { binary: true }),
        });

        expect(sent.map((one) => one.data)).toEqual(['true:undefined']);
    });

    it('emits message over Socket.IO, which names every emission', async () => {
        await run(onMessage('socket.send("pong");', 'socketio'));

        expect(sent).toEqual([{ connectionId: 'echo', data: 'pong', event: 'message' }]);
    });

    it('resolves a send with its secrets off: a script is not the person asking', async () => {
        const note = await run(onMessage('socket.send("{{who}} {{token}}");'));

        expect(sent.map((one) => one.data)).toEqual(['web {{token}}']);
        expect(note?.withheld).toEqual(['token']);
    });

    it('sends nothing through a socket that took the place of the one it ran for', async () => {
        const socket = onMessage('socket.send("late");');

        onMessage('');

        const note = await run(socket);

        expect(sent).toEqual([]);
        expect(note?.dropped).toBe(1);
        expect(note?.logs.at(-1)).toEqual({
            level: 'warn',
            notice: 'sends-dropped',
            params: { count: 1, limit: 100 },
        });
    });

    it('drops the sends over the rate of the connection, and counts them', async () => {
        const note = await run(
            onMessage('for (let i = 0; i < 5; i += 1) { socket.send(String(i)); }'),
            { rate: newSendRate(3) },
        );

        expect(sent.map((one) => one.data)).toEqual(['0', '1', '2']);
        expect(note?.dropped).toBe(2);
    });

    it('has no sendRequest: a frame never starts a request', async () => {
        const note = await run(onMessage('await sendRequest({ url: "http://127.0.0.1:1" });'));

        expect(note?.error).toBeDefined();
    });

    it('leaves the socket to the person when the script fails, and says so', async () => {
        const note = await run(onMessage('throw new Error("bad frame");'));

        expect(note?.error?.message).toContain('bad frame');
    });

    it('runs nothing for a socket without that script, or with it switched off', async () => {
        await expect(run(socketWith({}))).resolves.toBeUndefined();
        await expect(
            run(socketWith({ onMessage: { source: 'socket.send("x");', enabled: false } })),
        ).resolves.toBeUndefined();
        expect(sent).toEqual([]);
    });

    it('counts a run the switch of this machine stopped, and runs nothing', async () => {
        const off = approvedScripts();

        off.scripts = {
            ...off.scripts,
            scriptsSwitch: { enabled: () => false, set: off.scripts.scriptsSwitch.set },
        };

        const note = await run(onMessage('socket.send("x");'), {}, off);

        expect(note?.switchedOff).toBe(1);
        expect(sent).toEqual([]);
    });

    it('says nothing for a run the close cut', async () => {
        const controller = new AbortController();

        controller.abort();

        await expect(
            run(onMessage('socket.send("x");'), { signal: controller.signal }),
        ).resolves.toBeUndefined();
        expect(sent).toEqual([]);
    });
});

describe('an onConnect as the socket opens', () => {
    it('greets through the socket and sets a value of the connection', async () => {
        const note = await run(
            socketWith({ onConnect: { source: 'vars.set("hello", "1"); socket.send("hola");' } }),
            { event: 'onConnect', frame: undefined },
        );

        expect(sent.map((one) => one.data)).toEqual(['hola']);
        expect(note).toMatchObject({
            event: 'onConnect',
            variables: [{ name: 'hello', preview: '1' }],
        });
    });
});

describe('the rate of the sends of a connection', () => {
    it('lets the limit through each second, and opens again the next one', () => {
        let now = 0;
        const rate = newSendRate(2, () => now);

        expect([rate.take(), rate.take(), rate.take()]).toEqual([true, true, false]);

        now = 999;

        expect(rate.take()).toBe(false);

        now = 1_000;

        expect([rate.take(), rate.take(), rate.take()]).toEqual([true, true, false]);
    });
});
