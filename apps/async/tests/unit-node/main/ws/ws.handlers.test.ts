import {
    ACTIVITY_WINDOW_BYTES,
    CHANNELS,
    type ActivityRecord,
    type Empty,
    type Result,
    type WsActivityPush,
    type WsCloseRequest,
} from '@mandor/ipc';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { ActivityRecorder } from '../../../../src/main/record/activity-recorder.js';
import type { SocketManager, SocketManagerEvents } from '../../../../src/main/ws/socket-manager.js';
import { registerWsHandlers } from '../../../../src/main/ws/ws.handlers.js';
import { type IpcSpy, spyIpc, spyWindow, type WindowSpy } from '@mandor/host/testing';

type ManagerSpy = SocketManager & {
    closed: WsCloseRequest[];
    disposals: number;
};

let ipc: IpcSpy;
let window: WindowSpy;
let manager: ManagerSpy;
let events: SocketManagerEvents;
let dispose: () => void;

function spyManager(): ManagerSpy {
    const closed: WsCloseRequest[] = [];

    return {
        closed,
        disposals: 0,
        open: () => Promise.resolve(),
        retryNow: () => Promise.resolve(),
        send: () => Promise.resolve(),
        close: (request) => {
            closed.push(request);

            return Promise.resolve();
        },
        disposeAll: () => {
            manager.disposals += 1;
        },
    };
}

function call(channel: (typeof CHANNELS)[keyof typeof CHANNELS], payload: unknown) {
    return ipc.call(channel, payload) as Promise<Result<Empty>>;
}

beforeEach(() => {
    ipc = spyIpc();
    window = spyWindow();
    manager = spyManager();
    dispose = registerWsHandlers(ipc, {
        window,
        readSecret: () => Promise.resolve(null),
        networkFor: () => Promise.resolve({ tls: {} }),
        assertUrl: (_transport, value) => new URL(value),
        createManager: (given) => {
            events = given;

            return manager;
        },
    });
});

afterEach(() => {
    dispose();
});

describe('closing from the renderer', () => {
    it('hands a close to the port', async () => {
        await call(CHANNELS.wsClose, { connectionId: 'echo' });

        expect(manager.closed).toEqual([{ connectionId: 'echo' }]);
    });

    it('refuses an id that is not one path segment', async () => {
        await expect(call(CHANNELS.wsClose, { connectionId: '../echo' })).resolves.toMatchObject({
            ok: false,
            error: { code: 'bad-request' },
        });
    });
});

describe('what the port pushes to the renderer', () => {
    it('carries a change of state on its own channel', () => {
        events.onState({ connectionId: 'echo', state: 'open' });

        expect(window.sent).toEqual([[CHANNELS.wsState, { connectionId: 'echo', state: 'open' }]]);
    });

    /** Frames keep arriving after the user closes the window. Nothing may reach it. */
    it('says nothing once the window is gone', () => {
        window.destroy();
        events.onState({ connectionId: 'echo', state: 'closed' });
        events.onActivity({ connectionId: 'echo', records: [] });

        expect(window.sent).toEqual([]);
    });

    /** The window drops the front of a flood on arrival; the recording keeps every frame. */
    it('sends the window the tail of a heavy batch and records all of it', () => {
        const recorded: unknown[] = [];
        const recorder: ActivityRecorder = {
            start: () => Promise.resolve(),
            status: () => ({ active: true, entries: 0 }),
            stop: () => Promise.resolve(undefined),
            disposeAll: () => Promise.resolve(),
            write: (push) => {
                recorded.push(...push.records);
            },
        };
        const heavy = 'x'.repeat(ACTIVITY_WINDOW_BYTES / 2);
        const records: ActivityRecord[] = Array.from({ length: 6 }, (_, at) => ({
            at,
            data: heavy,
            direction: 'in',
        }));

        dispose();
        dispose = registerWsHandlers(ipc, {
            window,
            recorder,
            readSecret: () => Promise.resolve(null),
            networkFor: () => Promise.resolve({ tls: {} }),
            assertUrl: (_transport, value) => new URL(value),
            createManager: (given) => {
                events = given;

                return manager;
            },
        });
        events.onActivity({ connectionId: 'echo', records });

        const push = window.sent[0]?.[1] as WsActivityPush;

        expect(push.records.map((each) => each.at)).toEqual([4, 5]);
        expect(recorded).toHaveLength(6);
    });
});

describe('the disposer of the ws handlers', () => {
    it('closes what the port had open and leaves no channel registered', () => {
        expect(ipc.registered()).toEqual([
            CHANNELS.wsOpen,
            CHANNELS.wsSend,
            CHANNELS.wsClose,
            CHANNELS.wsRetryNow,
        ]);

        dispose();

        expect(manager.disposals).toBe(1);
        expect(ipc.registered()).toEqual([]);
    });
});

/**
 * Mandor Request opens no socket: its transport is a request that ends. The host answers by
 * registering nothing, so a renderer that asks for a channel that does not exist gets told so
 * instead of reaching a port that was invented to keep a type happy.
 */
describe('an app that brings no async transport', () => {
    it('registers no socket channel and disposes of nothing', () => {
        const empty = spyIpc();
        const stop = registerWsHandlers(empty, {
            window,
            readSecret: () => Promise.resolve(null),
            networkFor: () => Promise.resolve({ tls: {} }),
        });

        expect(empty.registered()).toEqual([]);
        expect(() => {
            stop();
        }).not.toThrow();
    });
});
