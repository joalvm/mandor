import {
    answerRedactor,
    newScriptSender,
    runChain,
    type AppHandlerContext,
    type ChainDeps,
    type ChainEntry,
    type ChainResult,
    type ChainRun,
    type EnvironmentPlace,
    type NetworkFor,
    type ScriptVariablesPlace,
} from '@mandor/host';
import type { RequestSendRequest } from '@mandor/ipc';
import type { ChainLog } from '@mandor/schema';

/** What one chain of scripts of a send asks of the app, whichever its phase. */
export type ChainScripts = Pick<AppHandlerContext, 'scripts' | 'scriptVariables'> & {
    logger: ChainDeps['logger'];
    /** How a `sendRequest` of a script reaches the network. */
    networkFor: NetworkFor;
};

/** The scripts of one event of a send, in the order they run, and what does not run of them. */
export type RequestScriptList = {
    entries: ChainEntry[];
    /** The scripts of another tool in the chain and the request: counted, never run. */
    imported: number;
    /** A level whose file could not be read: none of its scripts ran, and the console says so. */
    logs: ChainLog[];
};

/** What the scripts of one phase of a send said, for the window, whatever came of them. */
export type ScriptsOutput = ChainResult & { imported: number };

/** One chain of a send: its scripts, the photo the first one starts on, and how the photo moves. */
type SendChain = Pick<ChainRun, 'snapshot' | 'advance' | 'signal' | 'place'> & {
    list: RequestScriptList;
};

type ScriptEffect = ChainResult['effects'][number];

function isVar(effect: ScriptEffect): effect is Extract<ScriptEffect, { kind: 'var' }> {
    return effect.kind === 'var';
}

/** The values the effects of a script set; the last one of a name wins. */
export function varsOf(effects: readonly ScriptEffect[]): Record<string, string> {
    return Object.fromEntries(effects.filter(isVar).map(({ name, value }) => [name, value]));
}

/** The place whose values the scripts of a send read and set. */
export function scriptPlaceOf(
    place: EnvironmentPlace,
    input: Pick<RequestSendRequest, 'workspaceId' | 'environmentId'>,
): ScriptVariablesPlace {
    return {
        origin: place.repo,
        workspaceId: input.workspaceId,
        environmentId: input.environmentId,
    };
}

/** Runs one chain of a send, with what does not run of it told beside what ran. */
export async function runSendChain(deps: ChainScripts, chain: SendChain): Promise<ScriptsOutput> {
    const { list, ...run } = chain;
    const output = await runChain(
        {
            ...run,
            entries: list.entries,
            // The secrets of this moment come out of every answer, a secret learnt half way too.
            send: newScriptSender({
                networkFor: deps.networkFor,
                hide: (text) => answerRedactor()(text),
            }),
        },
        { ...deps.scripts, variables: deps.scriptVariables, logger: deps.logger },
    );

    return { ...output, logs: [...list.logs, ...output.logs], imported: list.imported };
}
