import {
    answerRedactor,
    environmentScope,
    newScriptSender,
    runChain,
    variableScopeOf,
    variableSnapshot,
    type ChainResult,
    type ChainSnapshot,
} from '@mandor/host';
import { scriptNotice, type ChainLog, type ConnectionTransport } from '@mandor/schema';
import { SCRIPT_LIMITS } from '@mandor/script';
import { resolveText } from '@mandor/vars';

import { connectionPlaceOf, type ConnectionScriptDeps } from './before-connect.js';
import { blankNote, noteOfChain, type ConnectionEvent, type EventNote } from './event-note.js';
import type { OpenedSocket } from './open-socket.js';
import type { SocketSendRequest } from './socket-manager.js';

/** A frame that arrived, as an `onMessage` reads it: no text for bytes or for one too large. */
export type IncomingFrame = {
    text: string | undefined;
    binary: boolean;
    event?: string | undefined;
};

/** The `socket.send` of a connection a second: `limit` of them leave, the rest are dropped. */
export type SendRate = { limit: number; take(): boolean };

export type EventRunDeps = ConnectionScriptDeps & {
    /** The sockets main holds: a send goes out only through the one its script ran for. */
    opened: ReadonlyMap<string, OpenedSocket>;
    send: (request: SocketSendRequest) => Promise<void>;
};

export type EventRun = {
    connectionId: string;
    socket: OpenedSocket;
    event: ConnectionEvent;
    frame?: IncomingFrame | undefined;
    rate: SendRate;
    signal: AbortSignal;
};

type ScriptEffect = ChainResult['effects'][number];

/** Socket.IO names every emission: `socket.send` emits `message`, as its own client does. */
const SEND_EVENT: Record<ConnectionTransport, { event?: string }> = {
    websocket: {},
    socketio: { event: 'message' },
};

/** `onMessage` has no `sendRequest`: a frame never starts a request. */
const SENDS_REQUESTS: Record<ConnectionEvent, boolean> = { onConnect: true, onMessage: false };

/** A window of one second: at most `limit` sends in it, the rest dropped. */
export function newSendRate(
    limit: number = SCRIPT_LIMITS.socketSendsPerSecond,
    now: () => number = Date.now,
): SendRate {
    let start = now();
    let count = 0;

    return {
        limit,
        take() {
            const at = now();

            if (at - start >= 1_000) {
                start = at;
                count = 0;
            }

            count += 1;

            return count <= limit;
        },
    };
}

function isSocketSend(effect: ScriptEffect): effect is Extract<ScriptEffect, { kind: 'socket' }> {
    return effect.kind === 'socket';
}

/**
 * The frame as the snapshot shows it; a field the frame lacks is not written. A server may hand a
 * secret of the handshake back in a frame: every spelling of one is hidden before the script reads
 * it, as the answer of a request is, so no value of a script keeps it for a later send.
 */
function messageOf(
    frame: IncomingFrame,
    hide: (text: string) => string,
): NonNullable<ChainSnapshot['message']> {
    return {
        direction: 'incoming',
        binary: frame.binary,
        ...(frame.text === undefined ? {} : { text: hide(frame.text) }),
        ...(frame.event === undefined ? {} : { event: hide(frame.event) }),
    };
}

type Sent = { logs: ChainLog[]; dropped: number; withheld: string[] };

/** Whether one send left: through the socket of the run, under the rate. */
async function sendOne(deps: EventRunDeps, run: EventRun, data: string): Promise<boolean> {
    if (deps.opened.get(run.connectionId) !== run.socket || !run.rate.take()) {
        return false;
    }

    const event = SEND_EVENT[run.socket.transport];

    try {
        await deps.send({ connectionId: run.connectionId, data, ...event });

        return true;
    } catch {
        return false;
    }
}

/**
 * The `socket.send` of a run, in order. Each resolves with secrets off: a script is not the person
 * asking for a secret. One whose socket is gone, or over `socketSendsPerSecond`, is dropped.
 */
async function sendEffects(
    deps: EventRunDeps,
    run: EventRun,
    output: ChainResult,
    resolve: (text: string) => ReturnType<typeof resolveText>,
): Promise<Sent> {
    let dropped = 0;
    const withheld = new Set<string>();

    for (const { value } of output.effects.filter(isSocketSend)) {
        const resolved = resolve(value);

        for (const name of resolved.withheld ?? []) {
            withheld.add(name);
        }

        if (!(await sendOne(deps, run, resolved.text))) {
            dropped += 1;
        }
    }

    const said = scriptNotice('sends-dropped', { count: dropped, limit: run.rate.limit });

    return { logs: dropped === 0 ? [] : [said], dropped, withheld: [...withheld] };
}

async function runEvent(deps: EventRunDeps, run: EventRun, source: string): Promise<EventNote> {
    const { socket } = run;
    const at = connectionPlaceOf(socket.place, socket);
    const scope = await environmentScope(
        socket.place,
        socket.workspaceId,
        socket.environmentId,
        null,
    );
    const frame =
        run.frame === undefined ? {} : { message: messageOf(run.frame, answerRedactor()) };
    const output = await runChain(
        {
            entries: [{ level: 'connection', name: run.connectionId, event: run.event, source }],
            snapshot: {
                variables: variableSnapshot(scope, deps.scriptVariables.values(at)),
                ...frame,
            },
            advance: (snapshot) => snapshot,
            signal: run.signal,
            place: at,
            send: SENDS_REQUESTS[run.event]
                ? newScriptSender({
                      networkFor: deps.networkFor,
                      hide: (text) => answerRedactor()(text),
                  })
                : undefined,
        },
        { ...deps.scripts, variables: deps.scriptVariables, logger: deps.logger },
    );
    const values = variableScopeOf(scope, deps.scriptVariables.values(at));
    const sent = await sendEffects(deps, run, output, (text) =>
        resolveText(text, values, { secrets: 'off' }),
    );
    const note = noteOfChain(run.connectionId, run.event, output);

    return {
        ...note,
        logs: [...note.logs, ...sent.logs],
        dropped: sent.dropped,
        withheld: sent.withheld,
    };
}

/**
 * The `onConnect` or the `onMessage` of a socket main holds, on the scripts it opened with. The
 * switch of this machine is read before each chain: one it stops counts in `switchedOff`. A script
 * that fails leaves the socket open and says so in the note. A run cut by the close says nothing.
 */
export async function runConnectionEvent(
    deps: EventRunDeps,
    run: EventRun,
): Promise<EventNote | undefined> {
    const entry = run.socket.scripts?.[run.event];

    if (entry === undefined || entry.enabled === false) {
        return undefined;
    }

    if (!deps.scripts.scriptsSwitch.enabled()) {
        return { ...blankNote(run.connectionId, run.event), switchedOff: 1 };
    }

    try {
        const note = await runEvent(deps, run, entry.source);

        return run.signal.aborted ? undefined : note;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        return {
            ...blankNote(run.connectionId, run.event),
            error: { message, errorName: 'RunFailed' },
        };
    }
}
