import type { ActivityRecord } from '@mandor/ipc';

import type { ConnectionScriptDeps } from './before-connect.js';
import {
    newSendRate,
    runConnectionEvent,
    type IncomingFrame,
    type SendRate,
} from './connection-scripts.js';
import type { ConnectionEvent, EventNote } from './event-note.js';
import { newMessageScriptQueue, type MessageQueueDeps } from './message-script-queue.js';
import type { OpenedSocket } from './open-socket.js';
import type { SocketSendRequest } from './socket-manager.js';

export type ScriptEventsDeps = {
    /** Absent where no script runs: a socket lives as it did before scripts. */
    scripts: ConnectionScriptDeps | undefined;
    opened: ReadonlyMap<string, OpenedSocket>;
    send: (request: SocketSendRequest) => Promise<void>;
    /** Where what the scripts said goes. */
    say: (note: EventNote) => void;
    limits?: (MessageQueueDeps['limits'] & { socketSendsPerSecond?: number }) | undefined;
};

/** The scripts that run while a socket lives, fed by what the port reports. */
export type ScriptEvents = {
    /** The socket opened, or opened again: its `onConnect` runs. */
    connected(connectionId: string): void;
    /** Frames the port reported: each one that arrived goes to the queue of `onMessage`. */
    arrived(connectionId: string, records: readonly ActivityRecord[]): void;
    /** The socket ended: what runs for it stops, and what it gathered is said. */
    ended(connectionId: string): void;
    dispose(): void;
};

function hasScript(socket: OpenedSocket | undefined, event: ConnectionEvent): boolean {
    const entry = socket?.scripts?.[event];

    return entry !== undefined && entry.enabled !== false;
}

/**
 * `onConnect` and `onMessage` of each socket main holds. Nothing here makes the socket wait: a
 * frame goes to a bounded queue, an `onConnect` runs beside the socket. `socket.send` of the
 * scripts of a connection share one `socketSendsPerSecond`.
 */
export function newScriptEvents(deps: ScriptEventsDeps): ScriptEvents {
    const rates = new Map<string, SendRate>();
    const connecting = new Map<string, AbortController>();

    function rateOf(connectionId: string): SendRate {
        const known = rates.get(connectionId);

        if (known !== undefined) {
            return known;
        }

        const rate = newSendRate(deps.limits?.socketSendsPerSecond);

        rates.set(connectionId, rate);

        return rate;
    }

    function run(
        connectionId: string,
        event: ConnectionEvent,
        signal: AbortSignal,
        frame?: IncomingFrame,
    ): Promise<EventNote | undefined> {
        const socket = deps.opened.get(connectionId);

        if (deps.scripts === undefined || socket === undefined) {
            return Promise.resolve(undefined);
        }

        return runConnectionEvent(
            { ...deps.scripts, opened: deps.opened, send: deps.send },
            { connectionId, socket, event, frame, rate: rateOf(connectionId), signal },
        );
    }

    const queue = newMessageScriptQueue({
        run: (connectionId, message, signal) => run(connectionId, 'onMessage', signal, message),
        say: deps.say,
        limits: deps.limits,
    });

    function ended(connectionId: string): void {
        connecting.get(connectionId)?.abort();
        connecting.delete(connectionId);
        queue.close(connectionId);
        rates.delete(connectionId);
    }

    return {
        connected(connectionId) {
            if (
                deps.scripts === undefined ||
                !hasScript(deps.opened.get(connectionId), 'onConnect')
            ) {
                return;
            }

            const controller = new AbortController();

            connecting.get(connectionId)?.abort();
            connecting.set(connectionId, controller);
            void run(connectionId, 'onConnect', controller.signal).then((note) => {
                if (connecting.get(connectionId) === controller) {
                    connecting.delete(connectionId);
                }

                if (note !== undefined) {
                    deps.say(note);
                }
            });
        },
        arrived(connectionId, records) {
            if (
                deps.scripts === undefined ||
                !hasScript(deps.opened.get(connectionId), 'onMessage')
            ) {
                return;
            }

            for (const record of records) {
                if (record.direction === 'in') {
                    queue.push(connectionId, record);
                }
            }
        },
        ended,
        dispose() {
            for (const connectionId of [...connecting.keys()]) {
                ended(connectionId);
            }

            queue.closeAll();
            rates.clear();
        },
    };
}
