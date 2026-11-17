import {
    answerRedactor,
    environmentScope,
    newScriptSender,
    runChain,
    variableSnapshot,
    type AppHandlerContext,
    type ChainDeps,
    type ChainEntry,
    type ChainResult,
    type ChainSnapshot,
    type EnvironmentPlace,
    type EnvironmentScope,
    type NetworkFor,
    type ScriptVariablesPlace,
} from '@mandor/host';
import { failure, success, type ErrorCode, type Result, type WsOpenRequest } from '@mandor/ipc';
import { scriptNotice } from '@mandor/schema';

import {
    applyConnectionEffects,
    handshakePhoto,
    untouched,
    type AppliedTemplate,
    type ConnectionTemplate,
} from './connection-effects.js';

/** What the scripts of a connection ask of the app. */
export type ConnectionScriptDeps = Pick<AppHandlerContext, 'scripts' | 'scriptVariables'> & {
    logger: ChainDeps['logger'];
    /** How a `sendRequest` of a script reaches the network. */
    networkFor: NetworkFor;
};

/** What an open resolves with once its scripts let it go: what they set counts. */
export type ConnectionGuard = {
    /** The disk as the scripts saw it, read once for scripts, variables and auth. */
    scope: EnvironmentScope;
    /** What scripts set in the place of the connection: the level above every other. */
    script: Readonly<Record<string, string>>;
    /** The handshake as the window sent it, before any script. */
    base: ConnectionTemplate;
    applied: AppliedTemplate;
};

/** The guard the open goes out with, or why it does not; and what the scripts said either way. */
export type BeforeConnect = {
    output: ChainResult | undefined;
    /** A script truly ran: a retry of the socket would reuse what it fetched once. */
    ran: boolean;
    result: Result<ConnectionGuard>;
};

type ScriptEffect = ChainResult['effects'][number];

/** A cancel is the person's: they closed the connection or opened it again. */
const CODE_OF_END: Partial<Record<string, ErrorCode>> = { Cancelled: 'ws-open-cancelled' };

function isVar(effect: ScriptEffect): effect is Extract<ScriptEffect, { kind: 'var' }> {
    return effect.kind === 'var';
}

/** The values the effects of a script set; the last one of a name wins. */
function varsOf(effects: readonly ScriptEffect[]): Record<string, string> {
    return Object.fromEntries(effects.filter(isVar).map(({ name, value }) => [name, value]));
}

/** The place whose values the scripts of a connection read and set. */
export function connectionPlaceOf(
    place: EnvironmentPlace,
    input: Pick<WsOpenRequest, 'workspaceId' | 'environmentId'>,
): ScriptVariablesPlace {
    return {
        origin: place.repo,
        workspaceId: input.workspaceId,
        environmentId: input.environmentId,
    };
}

/** The script of `onBeforeConnect`, unless the open skips its scripts. */
export function beforeConnectEntries(input: WsOpenRequest): ChainEntry[] {
    const entry = input.scripts?.onBeforeConnect;

    if (entry === undefined || input.skipScripts === true) {
        return [];
    }

    return [
        {
            level: 'connection',
            name: input.connectionId,
            event: 'onBeforeConnect',
            source: entry.source,
            enabled: entry.enabled,
        },
    ];
}

/** Whether some script of the chain ran: not switched off, not skipped, not off by itself. */
function ranAny(entries: readonly ChainEntry[], output: ChainResult): boolean {
    const enabled = entries.filter((entry) => entry.enabled !== false).length;

    return enabled > output.skipped.length + output.switchedOff;
}

type BeforeRun = {
    scope: EnvironmentScope;
    at: ScriptVariablesPlace;
    input: WsOpenRequest;
    entries: ChainEntry[];
    signal: AbortSignal;
};

function runBefore(deps: ConnectionScriptDeps, run: BeforeRun): Promise<ChainResult> {
    const { scope, at, input, entries, signal } = run;
    const script = deps.scriptVariables.values(at);
    const done: ScriptEffect[] = [];

    function photo(): ChainSnapshot {
        return {
            variables: variableSnapshot(scope, { ...script, ...varsOf(done) }),
            request: handshakePhoto(applyConnectionEffects(input.template, done).template),
        };
    }

    return runChain(
        {
            entries,
            snapshot: photo(),
            advance: (_snapshot, effects) => {
                done.push(...effects);

                return photo();
            },
            signal,
            place: at,
            // The secrets of this moment come out of every answer, a secret learnt half way too.
            send: newScriptSender({
                networkFor: deps.networkFor,
                hide: (text) => answerRedactor()(text),
            }),
        },
        { ...deps.scripts, variables: deps.scriptVariables, logger: deps.logger },
    );
}

/** The script that ended the chain, named in the refusal; a cancel ends the open as a cancel. */
function failureOf(error: NonNullable<ChainResult['error']>): Result<never> {
    const where = `${error.level ?? ''} ${error.name ?? ''}`.trim();

    return failure(CODE_OF_END[error.errorName] ?? 'script-failed', `${where}: ${error.message}`);
}

/** The line a socket whose script ran leaves: it stops retrying on its own. */
const NO_RECONNECT_NOTE = scriptNotice('no-reconnect');

/**
 * The script of `onBeforeConnect`, then the guard the open resolves with. The disk is read once
 * here for the scripts, the variables and the auth. An open that skips its scripts still resolves
 * with what scripts set before, and with the rule of destination. A script that fails, or a chain
 * that runs out of time, keeps the socket from opening. A socket whose script ran does not
 * reconnect on its own, and the console says so.
 */
export async function scriptsBeforeConnect(
    deps: ConnectionScriptDeps,
    place: EnvironmentPlace,
    input: WsOpenRequest,
    signal: AbortSignal,
): Promise<BeforeConnect> {
    const at = connectionPlaceOf(place, input);
    // A connection is not in the collection: no folder of the tree resolves its url or headers.
    const scope = await environmentScope(place, input.workspaceId, input.environmentId, null);
    const entries = beforeConnectEntries(input);
    const output =
        entries.length === 0
            ? undefined
            : await runBefore(deps, { scope, at, input, entries, signal });
    const ran = output !== undefined && ranAny(entries, output);

    if (output?.error !== undefined) {
        return { output, ran, result: failureOf(output.error) };
    }

    const applied =
        output === undefined
            ? untouched(input.template)
            : applyConnectionEffects(input.template, output.effects);
    const script = deps.scriptVariables.values(at);
    const said =
        output !== undefined && ran
            ? { ...output, logs: [...output.logs, NO_RECONNECT_NOTE] }
            : output;

    return { output: said, ran, result: success({ scope, script, base: input.template, applied }) };
}
