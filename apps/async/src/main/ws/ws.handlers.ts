import {
    CHANNELS,
    failure,
    wsCloseRequestSchema,
    wsSendRequestSchema,
    type Empty,
    type Result,
    type WsStatePush,
} from '@mandor/ipc';

import {
    activeRepo,
    type AppHandlerContext,
    type EnvironmentPlace,
    type HandlerIpc,
    type NetworkFor,
    type PushTarget,
    pushToWindow,
    type ReadSecretValue,
} from '@mandor/host';

import type { ActivityRecorder } from '../record/activity-recorder.js';
import type { ConnectionScriptDeps } from './before-connect.js';
import type { EventNote } from './event-note.js';
import { openSocket, type OpenedSocket, type OpeningEnd } from './open-socket.js';
import type { AssertSocketUrl } from './resolve-ws-open.js';
import { resolveWsSend } from './resolve-ws-send.js';
import { retryNowSocket } from './retry-now-socket.js';
import { newScriptEvents, type ScriptEvents, type ScriptEventsDeps } from './script-events.js';
import { socketAttempt } from './socket-attempt.js';
import type { CreateSocketManager, SocketManager } from './socket-manager.js';
import { windowTail } from './window-tail.js';

export type WsHandlerDeps = {
    window: PushTarget;
    /** Absent in an app whose transport opens no socket. Mandor Request is that app. */
    createManager?: CreateSocketManager | undefined;
    /** Supplied by the async app so the shared host does not choose a transport. */
    assertUrl?: AssertSocketUrl | undefined;
    /** How a value declared secret is read while a connection resolves. */
    readSecret: ReadSecretValue;
    /** The proxy and the certificates of the settings, for the url a socket dials. */
    networkFor: NetworkFor;
    /** Absent where nothing records: the recording writes beside the push it mirrors. */
    recorder?: ActivityRecorder | undefined;
    /** What this machine approved, the switch and the workers. Absent: no script runs. */
    scriptWorker?: AppHandlerContext['scripts'] | undefined;
    /** What scripts set, the same values the window clears. */
    scriptVariables?: AppHandlerContext['scriptVariables'] | undefined;
    logger?: ConnectionScriptDeps['logger'] | undefined;
    /** Where what the scripts of a connection said goes. Absent: nowhere. */
    onScriptNote?: ((note: EventNote) => void) | undefined;
    /** The caps of the scripts that run while a socket lives. Absent: those of `SCRIPT_LIMITS`. */
    scriptLimits?: ScriptEventsDeps['limits'];
};

/** What the state of a socket starts or ends among its scripts. */
const SCRIPTS_ON_STATE: Partial<
    Record<WsStatePush['state'], (events: ScriptEvents, connectionId: string) => void>
> = {
    open: (events, connectionId) => {
        events.connected(connectionId);
    },
    closed: (events, connectionId) => {
        events.ended(connectionId);
    },
    error: (events, connectionId) => {
        events.ended(connectionId);
    },
};

/** The scripts of a connection, when the app brought all they need. */
function scriptsOf(deps: WsHandlerDeps): ConnectionScriptDeps | undefined {
    const { scriptWorker, scriptVariables, logger, networkFor } = deps;

    if (scriptWorker === undefined || scriptVariables === undefined || logger === undefined) {
        return undefined;
    }

    return { scripts: scriptWorker, scriptVariables, logger, networkFor };
}

/**
 * The three channels that reach a socket, and the two that come back. The scheme of the URL
 * is decided here, at the border of main: the renderer already checked it, and the renderer
 * is the part of Mandor a stranger can reach.
 *
 * An app that brings no port registers nothing: a renderer that asks for a channel that was
 * never registered is refused, which is the truth, and a manager invented to fill the hole
 * would be a socket nobody asked for.
 */
export function registerWsHandlers(ipc: HandlerIpc, deps: WsHandlerDeps): () => void {
    const createManager = deps.createManager;
    const assertUrl = deps.assertUrl;

    if (createManager === undefined || assertUrl === undefined) {
        return () => undefined;
    }

    const opened = new Map<string, OpenedSocket>();
    const opening = new Map<string, AbortController>();
    const tell = (note: EventNote) => deps.onScriptNote?.(note);
    const events = newScriptEvents({
        scripts: scriptsOf(deps),
        opened,
        send: (request) => manager.send(request),
        say: tell,
        limits: deps.scriptLimits,
    });
    const manager = createManager({
        onState: (push) => {
            pushToWindow(deps.window, CHANNELS.wsState, push);
            // onConnect on each open, a reconnect too; the end of the socket ends its onMessage.
            SCRIPTS_ON_STATE[push.state]?.(events, push.connectionId);
        },
        onActivity: (push) => {
            // The recording writes what arrived as it arrived: beside the push, never after it.
            deps.recorder?.write(push);
            pushToWindow(deps.window, CHANNELS.wsActivity, {
                ...push,
                environmentId: opened.get(push.connectionId)?.environmentId ?? null,
                records: windowTail(push.records),
            });
            // onMessage queues what arrived and never makes the port wait.
            events.arrived(push.connectionId, push.records);
        },
    });

    ipc.handle(CHANNELS.wsOpen, (_event, raw) =>
        openSocket(
            {
                manager,
                opened,
                opening,
                assertUrl,
                readSecret: deps.readSecret,
                networkFor: deps.networkFor,
                scripts: scriptsOf(deps),
                pushState: (push) => {
                    pushToWindow(deps.window, CHANNELS.wsState, push);
                },
                onScriptNote: tell,
            },
            raw,
        ),
    );
    ipc.handle(CHANNELS.wsSend, (_event, raw) =>
        sendOverSocket({ manager, opened, readSecret: deps.readSecret }, raw),
    );
    ipc.handle(CHANNELS.wsClose, (_event, raw) =>
        closeSocket({ manager, opened, opening, events }, raw),
    );
    ipc.handle(CHANNELS.wsRetryNow, (_event, raw) => retryNowSocket(manager, raw));

    return () => {
        for (const controller of opening.values()) {
            controller.abort('closed' satisfies OpeningEnd);
        }

        opening.clear();
        events.dispose();
        manager.disposeAll();
        opened.clear();
        ipc.removeHandler(CHANNELS.wsOpen);
        ipc.removeHandler(CHANNELS.wsSend);
        ipc.removeHandler(CHANNELS.wsClose);
        ipc.removeHandler(CHANNELS.wsRetryNow);
    };
}

/** What one send needs: the port, how a kept value is asked for, and what each socket opened with. */
type SendDeps = {
    manager: SocketManager;
    opened: Map<string, OpenedSocket>;
    readSecret: ReadSecretValue;
};

async function sendOverSocket(deps: SendDeps, raw: unknown): Promise<Result<Empty>> {
    const request = wsSendRequestSchema.safeParse(raw);

    if (!request.success) {
        return failure('bad-request', request.error.message);
    }

    const repo = activeRepo();

    if (!repo.ok) {
        return repo;
    }

    const place: EnvironmentPlace = {
        root: repo.value.root,
        repo: repo.value.id,
        readSecret: deps.readSecret,
    };
    // A socket resolves against the environment it was opened with, which is the one the
    // timeline is stamped with, and with the secrets it lives with. A socket main does not hold
    // takes no frame: what the window says is no answer.
    const id = request.data.connectionId;
    const openedSocket = deps.opened.get(id);

    if (openedSocket === undefined) {
        return failure('ws-send-failed', 'the socket is not open');
    }

    // The transports that speak names refuse an unnamed emission at the border: refusing the
    // request costs less than an empty frame the peer never asked for.
    if (openedSocket.transport === 'socketio' && request.data.event === undefined) {
        return failure('bad-request', 'a Socket.IO emission names the event it is emitted to');
    }

    return socketAttempt('ws-send-failed', async () => {
        const frame = await resolveWsSend(place, request.data, openedSocket);

        // A frame resolved for one socket never falls into the one that took its place meanwhile.
        if (deps.opened.get(id) !== openedSocket) {
            throw new Error('the socket the frame was resolved for is gone');
        }

        await deps.manager.send(frame);
    });
}

type CloseDeps = {
    manager: SocketManager;
    opened: Map<string, OpenedSocket>;
    opening: Map<string, AbortController>;
    events: ScriptEvents;
};

async function closeSocket(deps: CloseDeps, raw: unknown): Promise<Result<Empty>> {
    const request = wsCloseRequestSchema.safeParse(raw);

    if (!request.success) {
        return failure('bad-request', request.error.message);
    }

    const id = request.data.connectionId;
    // The script still running before the open stops here: the socket it was for never opens.
    const running = deps.opening.get(id);

    running?.abort('closed' satisfies OpeningEnd);

    if (running !== undefined) {
        deps.opening.delete(id);
    }

    deps.events.ended(id);

    const closing = deps.opened.get(id);

    // Closing has no code of its own: the contract names the two failures that can cost the
    // user a message, and a close that refused is not one of them.
    return socketAttempt('unknown', async () => {
        await deps.manager.close(request.data);

        // An open that came while this one closed holds the slot now: only this entry leaves.
        if (deps.opened.get(id) === closing) {
            deps.opened.delete(id);
        }
    });
}
