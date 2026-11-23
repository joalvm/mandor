import {
    environmentScope,
    variableSnapshot,
    type ChainEntry,
    type ChainResult,
    type ChainSnapshot,
    type EnvironmentPlace,
    type EnvironmentScope,
    type ScriptVariablesPlace,
} from '@mandor/host';
import {
    failure,
    success,
    type ErrorCode,
    type RequestScriptOutput,
    type RequestSendRequest,
    type Result,
} from '@mandor/ipc';
import {
    itemParentOf,
    scriptNotice,
    type FolderChainLevel,
    type RequestItem,
    type RequestScriptEvent,
    type ScriptEntry,
} from '@mandor/schema';
import { SCRIPT_LIMITS } from '@mandor/script';

import { applyScriptEffects, noEffects } from './apply-script-effects.js';
import type { SendGuard } from './guarded-resolution.js';
import { requestPhoto } from './request-photo.js';
import type { ResponsesInFlight } from './responses-in-flight.js';
import {
    runSendChain,
    scriptPlaceOf,
    varsOf,
    type ChainScripts,
    type RequestScriptList,
    type ScriptsOutput,
} from './send-chain.js';

type ScriptRequest = Pick<RequestItem, 'name' | 'scripts'>;

type GroupLevel = FolderChainLevel & { level: 'collection' | 'folder' };

/** What the window says of a level of the chain that could not be read. */
const UNREADABLE_NOTICE = {
    collection: 'collection-unreadable',
    folder: 'folder-unreadable',
} as const satisfies Record<GroupLevel['level'], string>;

/** The workspace closes the chain with its variables and its auth; it holds no script of a send. */
function isGroup(level: FolderChainLevel): level is GroupLevel {
    return level.level !== 'workspace';
}

function entriesOf(
    level: ChainEntry['level'],
    name: string,
    event: RequestScriptEvent,
    entry: ScriptEntry | undefined,
): ChainEntry[] {
    if (entry === undefined) {
        return [];
    }

    return [{ level, name, event, source: entry.source, enabled: entry.enabled }];
}

/**
 * The scripts of the user for one event of a send: the collection first, then each folder down
 * to the request, which comes last. The levels above come from disk, read once with the rest of
 * the send; the request comes as the window shows it.
 */
export function requestScripts(
    chain: readonly FolderChainLevel[],
    request: ScriptRequest,
    event: RequestScriptEvent,
): RequestScriptList {
    // The chain comes closest first; scripts run from the top down.
    const groups = [...chain].reverse().filter(isGroup);
    const readable = groups.filter((group) => group.unreadable !== true);
    const logs = groups
        .filter((group) => group.unreadable === true)
        .map((group) => scriptNotice(UNREADABLE_NOTICE[group.level], { name: group.name }));
    const entries = [
        ...readable.flatMap((group) =>
            entriesOf(group.level, group.name, event, group.settings.scripts?.[event]),
        ),
        ...entriesOf('request', request.name, event, request.scripts?.[event]),
    ];

    return { entries, logs };
}

/** What the scripts of a send ask of the app. */
export type SendScripts = ChainScripts & {
    /** The `onResponse` chains in flight: a send waits for those of its place before it reads. */
    inFlight: ResponsesInFlight;
    /** Told what the scripts of each phase of a send said. Absent, nobody is told. */
    tell?: ((output: RequestScriptOutput) => void) | undefined;
};

/** The guard the send goes out with, or why it does not; and what the scripts said either way. */
export type BeforeSend = { output: ScriptsOutput | undefined; result: Result<SendGuard> };

type ScriptEffect = ChainResult['effects'][number];

/** A cancel is the person's: it ends the send as any cancel does. */
const CODE_OF_END: Partial<Record<string, ErrorCode>> = { Cancelled: 'request-aborted' };

/** The photo of a script: what the ones before it wrote, on the request and in the variables. */
function photoOf(
    scope: EnvironmentScope,
    script: Readonly<Record<string, string>>,
    request: RequestItem,
    effects: readonly ScriptEffect[],
): ChainSnapshot {
    return {
        variables: variableSnapshot(scope, { ...script, ...varsOf(effects) }),
        request: requestPhoto(scope.chain, applyScriptEffects(request, effects)),
    };
}

function runBefore(
    deps: SendScripts,
    scope: EnvironmentScope,
    input: Omit<RequestSendRequest, 'sendId'>,
    run: { place: ScriptVariablesPlace; signal: AbortSignal },
): Promise<ScriptsOutput> {
    const script = deps.scriptVariables.values(run.place);
    const done: ScriptEffect[] = [];

    return runSendChain(deps, {
        ...run,
        list: requestScripts(scope.chain, input.request, 'onBeforeRequest'),
        snapshot: photoOf(scope, script, input.request, done),
        advance: (_snapshot, effects) => {
            done.push(...effects);

            return photoOf(scope, script, input.request, done);
        },
    });
}

/** The script that ended the chain, named in the refusal; a cancel ends the send as a cancel. */
function failureOf(error: NonNullable<ChainResult['error']>): Result<never> {
    const where = `${error.level ?? ''} ${error.name ?? ''}`.trim();

    return failure(CODE_OF_END[error.errorName] ?? 'script-failed', `${where}: ${error.message}`);
}

type BeforeParts = {
    scope: EnvironmentScope;
    at: ScriptVariablesPlace;
    input: Omit<RequestSendRequest, 'sendId'>;
    output: ScriptsOutput | undefined;
};

/** The guard of a send whose scripts let it go, read after them: what they set counts. */
function guardOf(deps: SendScripts, { scope, at, input, output }: BeforeParts): BeforeSend {
    const applied =
        output === undefined
            ? noEffects(input.request)
            : applyScriptEffects(input.request, output.effects);
    const guard = { scope, script: deps.scriptVariables.values(at), base: input.request, applied };

    return {
        output:
            output === undefined
                ? undefined
                : { ...output, logs: [...output.logs, ...applied.logs] },
        result: success(guard),
    };
}

/**
 * The scripts of `onBeforeRequest`, then the guard the send resolves with. First the send waits
 * for the scripts of an answer still running in its place, scripts or not: what they set is what
 * it reads. The disk is read once here for the scripts, the variables, the headers and the auth.
 * A send that skips its scripts still resolves with what scripts set before, and with the rule of
 * destination. A script that fails, or a chain that runs out of time, keeps the request from
 * leaving.
 */
export async function scriptsBeforeSend(
    deps: SendScripts,
    place: EnvironmentPlace,
    input: Omit<RequestSendRequest, 'sendId'>,
    signal: AbortSignal,
): Promise<BeforeSend> {
    const at = scriptPlaceOf(place, input);

    await deps.inFlight.settled(at, SCRIPT_LIMITS.chainMs, signal);

    if (signal.aborted) {
        return { output: undefined, result: failure('request-aborted', 'The send was cancelled.') };
    }

    const scope = await environmentScope(
        place,
        input.workspaceId,
        input.environmentId,
        itemParentOf(input.itemPath),
    );
    const output =
        input.skipScripts === true
            ? undefined
            : await runBefore(deps, scope, input, { place: at, signal });

    if (output?.error !== undefined) {
        return { output, result: failureOf(output.error) };
    }

    return guardOf(deps, { scope, at, input, output });
}
