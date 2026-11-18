import {
    failure,
    success,
    wsOpenRequestSchema,
    type Empty,
    type Result,
    type WsOpenRequest,
    type WsStatePush,
} from '@mandor/ipc';

import {
    activeRepo,
    type ChainResult,
    type DialNetwork,
    type EnvironmentPlace,
    type NetworkFor,
    type ReadSecretValue,
} from '@mandor/host';
import type { ConnectionScripts, ConnectionTransport } from '@mandor/schema';

import {
    beforeConnectEntries,
    scriptsBeforeConnect,
    type BeforeConnect,
    type ConnectionGuard,
    type ConnectionScriptDeps,
} from './before-connect.js';
import { noteOfChain, type EventNote } from './event-note.js';
import { resolveWsOpen, type AssertSocketUrl, type SecretsOff } from './resolve-ws-open.js';
import { socketAttempt } from './socket-attempt.js';
import type { SocketManager, SocketOpenRequest } from './socket-manager.js';

/** What one live socket opened with; the send path reads it back instead of guessing. */
export type OpenedSocket = {
    environmentId: string | null;
    transport: ConnectionTransport;
    workspaceId: string;
    /** The scripts as they were when it opened: an edit counts from the next connect. */
    scripts: ConnectionScripts | undefined;
    /** Set for the life of the socket: every frame of it resolves with secrets off. */
    secretsOff: SecretsOff;
    /** The repo it opened in: its scripts read and set the values of that place. */
    place: EnvironmentPlace;
};

/** Why an `onBeforeConnect` in flight was stopped: the person closed it, or opened it again. */
export type OpeningEnd = 'closed' | 'replaced';

/** What one open needs: the port that carries it and the answers main alone knows. */
type OpenDeps = {
    manager: SocketManager;
    opened: Map<string, OpenedSocket>;
    /** The `onBeforeConnect` running per connection, so a close or another open can stop it. */
    opening: Map<string, AbortController>;
    assertUrl: AssertSocketUrl;
    readSecret: ReadSecretValue;
    networkFor: NetworkFor;
    /** Absent where no script runs: the open is the one of before scripts existed. */
    scripts?: ConnectionScriptDeps | undefined;
    /** How the state of a socket that is not in the port yet reaches the window. */
    pushState?: ((push: WsStatePush) => void) | undefined;
    /** How what `onBeforeConnect` said reaches the window. */
    onScriptNote?: ((note: EventNote) => void) | undefined;
};

/** A socket whose script ran does not retry on its own: it would reuse what the script fetched. */
const NO_RECONNECT = { baseMs: 0, ceilingMs: 0, maxAttempts: 0 };

/** How one open went, read when it ends: whether the tab was told it connects, and by whom. */
type OpenRun = {
    /** The tab was told `connecting` before a script: a way out that opens nothing says `closed`. */
    connecting: boolean;
    /** Another open of the connection took its place, and owns the state now. */
    replaced: boolean;
    /** The port has the socket: from here the port tells every state. */
    ported: boolean;
    /** Why the open stopped before the port, with a code of its own. */
    refusal: Result<Empty> | undefined;
    /** What `onBeforeConnect` said, unless the person stopped it. */
    said: ChainResult | undefined;
    /** How the handshake went out, once it resolved. */
    secretsOff: SecretsOff;
    withheld: string[];
};

/** The note of the `onBeforeConnect` of this open, with how its handshake went out. */
function beforeConnectNote(connectionId: string, run: OpenRun, said: ChainResult): EventNote {
    return {
        ...noteOfChain(connectionId, 'onBeforeConnect', said),
        withheld: run.withheld,
        ...(run.secretsOff === null ? {} : { secretsOff: run.secretsOff }),
    };
}

function say(deps: OpenDeps, connectionId: string, state: WsStatePush['state']): void {
    deps.pushState?.({ connectionId, state });
}

/**
 * Runs `onBeforeConnect` while the tab says it is connecting. A close, another open of the same
 * connection, or letting the handlers go aborts it; an aborted one opens nothing and paints no
 * failure.
 */
async function runBeforeConnect(
    deps: OpenDeps,
    scripts: ConnectionScriptDeps,
    run: OpenRun,
    input: WsOpenRequest & { place: EnvironmentPlace },
): Promise<BeforeConnect> {
    const id = input.connectionId;
    const controller = new AbortController();

    deps.opening.set(id, controller);
    run.connecting = true;
    say(deps, id, 'connecting');

    try {
        const before = await scriptsBeforeConnect(scripts, input.place, input, controller.signal);

        if (controller.signal.aborted) {
            run.replaced = controller.signal.reason === ('replaced' satisfies OpeningEnd);

            return { ...before, result: failure('ws-open-cancelled', 'The open was cancelled.') };
        }

        run.said = before.output;

        return before;
    } finally {
        if (deps.opening.get(id) === controller) {
            deps.opening.delete(id);
        }
    }
}

type Guarded = { guard: ConnectionGuard | undefined; ran: boolean };

/** The guard of the open, once its scripts let it go; nothing when no script machinery exists. */
async function guardOf(
    deps: OpenDeps,
    run: OpenRun,
    input: WsOpenRequest & { place: EnvironmentPlace },
): Promise<Result<Guarded>> {
    const scripts = deps.scripts;

    // A new open of the connection replaces the one whose script still runs.
    deps.opening.get(input.connectionId)?.abort('replaced' satisfies OpeningEnd);

    if (scripts === undefined) {
        return success({ guard: undefined, ran: false });
    }

    // Nothing to run: the guard of what scripts set before, with no state of its own.
    const before =
        beforeConnectEntries(input).length === 0
            ? await scriptsBeforeConnect(scripts, input.place, input, new AbortController().signal)
            : await runBeforeConnect(deps, scripts, run, input);

    return before.result.ok
        ? success({ guard: before.result.value, ran: before.ran })
        : before.result;
}

/**
 * Opens the socket a renderer asked for, through the network the settings name for its url. The
 * `onBeforeConnect` of the connection runs first; a script that fails, runs out of time or is
 * cancelled opens nothing.
 */
export async function openSocket(deps: OpenDeps, raw: unknown): Promise<Result<Empty>> {
    const request = wsOpenRequestSchema.safeParse(raw);

    if (!request.success) {
        return failure('bad-request', request.error.message);
    }

    const repo = activeRepo();

    if (!repo.ok) {
        return repo;
    }

    const place = { root: repo.value.root, repo: repo.value.id, readSecret: deps.readSecret };
    const input = { ...request.data, place };
    const run: OpenRun = {
        connecting: false,
        replaced: false,
        ported: false,
        refusal: undefined,
        said: undefined,
        secretsOff: null,
        withheld: [],
    };
    const attempt = await socketAttempt('ws-open-failed', async () => {
        const guarded = await guardOf(deps, run, input);

        if (!guarded.ok) {
            run.refusal = guarded;

            return;
        }

        await dial(deps, run, input, guarded.value);
    });
    const result = run.refusal ?? attempt;

    if (run.said !== undefined) {
        deps.onScriptNote?.(beforeConnectNote(input.connectionId, run, run.said));
    }

    if (!result.ok && run.connecting && !run.replaced && !run.ported) {
        say(deps, input.connectionId, 'closed');
    }

    return result;
}

/** Resolves the handshake with the guard and hands it to the port; the slot is this open's. */
async function dial(
    deps: OpenDeps,
    run: OpenRun,
    input: WsOpenRequest & { place: EnvironmentPlace },
    { guard, ran }: Guarded,
): Promise<void> {
    const { assertUrl, networkFor } = deps;
    const { place, ...open } = input;
    const resolved = await resolveWsOpen(place, open, { assertUrl, networkFor }, guard);
    const network = await deps.networkFor(resolved.request.url);

    run.secretsOff = resolved.secretsOff;
    run.withheld = resolved.withheld;

    const entry: OpenedSocket = {
        environmentId: resolved.environmentId,
        transport: input.transport,
        workspaceId: input.workspaceId,
        scripts: input.scripts,
        secretsOff: resolved.secretsOff,
        place,
    };

    deps.opened.set(input.connectionId, entry);
    run.ported = true;

    try {
        await deps.manager.open({
            ...resolved.request,
            ...(ran ? { reconnect: NO_RECONNECT } : {}),
            ...networkFieldsOf(network),
        });
    } catch (error) {
        // Another open may hold the slot by now: only this open's entry leaves with it.
        if (deps.opened.get(input.connectionId) === entry) {
            deps.opened.delete(input.connectionId);
        }

        throw error;
    }
}

/** The proxy and the certificates beside the open, each only when the settings name one. */
function networkFieldsOf(network: DialNetwork): Pick<SocketOpenRequest, 'proxy' | 'tls'> {
    const proxy = network.proxy === undefined ? {} : { proxy: network.proxy };
    const tls = Object.keys(network.tls).length === 0 ? {} : { tls: network.tls };

    return { ...proxy, ...tls };
}
