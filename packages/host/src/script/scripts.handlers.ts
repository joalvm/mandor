import {
    CHANNELS,
    scriptsApproveRequestSchema,
    scriptsClearVariablesRequestSchema,
    scriptsForgetRequestSchema,
    scriptsStatusRequestSchema,
    scriptsSwitchWriteRequestSchema,
    success,
    type Empty,
    type Result,
    type ScriptsApproveRequest,
    type ScriptsStatusRequest,
    type ScriptStatus,
} from '@mandor/ipc';
import { SCRIPT_LIMITS } from '@mandor/script';
import { z } from 'zod';

import { checkedRequest } from '../ipc/checked-request.js';
import type { HandlerIpc } from '../ipc/handler-ipc.js';
import { activeRepo } from '../origin/active-repo.js';
import { approvalKey } from './approval-key.js';
import { approvedScripts, type ApprovedScripts } from './approved-scripts.js';
import type { ScriptVariables } from './script-variables.js';
import {
    newScriptSlots,
    startScriptWorker,
    type ScriptChain,
    type ScriptChainOptions,
} from './start-script-worker.js';
import { createScriptsSwitch, type ScriptsSwitch } from './scripts-switch.js';

type ScriptsHandlerDeps = {
    approvals: ApprovedScripts;
    scriptsSwitch: ScriptsSwitch;
};

/** What the handlers of scripts answer from: the two of the run and the values of the window. */
type HandlerScripts = ScriptsHandlerDeps & { variables: ScriptVariables };

/** The scripts of the run as a window sees them: it may start chains, never close the workers. */
export type RunScripts = ScriptsHandlerDeps & {
    /** A chain of scripts over the workers of the app, which a script cannot stop. */
    startChain: (options: ScriptChainOptions) => ScriptChain;
};

/**
 * One of each for the whole run: the approvals and the switch are what every window asks, and the
 * workers of the bundle at `workerPath` outlive a window. `close` is for the end of the run.
 */
export async function openScripts(
    userDataDir: string,
    workerPath: string,
): Promise<RunScripts & { close: () => void }> {
    const slots = newScriptSlots(workerPath);

    return {
        approvals: approvedScripts(userDataDir),
        scriptsSwitch: await createScriptsSwitch(userDataDir),
        startChain: (options) => startScriptWorker(slots, options),
        close: () => {
            slots.close();
        },
    };
}

const NO_REQUEST = z.object({}).strict();

type Place = Pick<ScriptsApproveRequest, 'workspaceId' | 'level' | 'event'>;

/** A text over the limit is never hashed or kept: it could not run, so there is nothing to approve. */
function isTooLarge(source: string): boolean {
    return Buffer.byteLength(source) > SCRIPT_LIMITS.sourceBytes;
}

function keyOf(origin: string, place: Place, source: string): string {
    const { workspaceId, level, event } = place;

    return approvalKey({ origin, workspaceId, level, event, source });
}

/**
 * Whether the text a key was typed over may be taken as the person's own: nothing there, or a
 * text that was already approved in this place. A text that came in with a `pull` is neither, so
 * it is not washed by a key.
 */
async function mayContinue(
    deps: ScriptsHandlerDeps,
    origin: string,
    request: ScriptsApproveRequest,
): Promise<boolean> {
    const { previousSource } = request;

    if (previousSource === undefined || previousSource === '') {
        return true;
    }

    return (
        !isTooLarge(previousSource) &&
        deps.approvals.isApproved(keyOf(origin, request, previousSource))
    );
}

async function approve(
    deps: ScriptsHandlerDeps,
    request: ScriptsApproveRequest,
): Promise<Result<{ approved: boolean }>> {
    const repo = activeRepo();

    if (!repo.ok) {
        return repo;
    }

    const origin = repo.value.id;

    if (isTooLarge(request.source) || !(await mayContinue(deps, origin, request))) {
        return success({ approved: false });
    }

    await deps.approvals.approve(keyOf(origin, request, request.source));

    return success({ approved: true });
}

async function statusOf(
    deps: ScriptsHandlerDeps,
    origin: string,
    script: ScriptsStatusRequest['scripts'][number],
): Promise<ScriptStatus> {
    if (isTooLarge(script.source)) {
        return 'tooLarge';
    }

    return (await deps.approvals.isApproved(keyOf(origin, script, script.source)))
        ? 'approved'
        : 'unapproved';
}

async function status(
    deps: ScriptsHandlerDeps,
    request: ScriptsStatusRequest,
): Promise<Result<{ statuses: ScriptStatus[] }>> {
    const repo = activeRepo();

    if (!repo.ok) {
        return repo;
    }

    const statuses = await Promise.all(
        request.scripts.map((script) => statusOf(deps, repo.value.id, script)),
    );

    return success({ statuses });
}

/** Forgetting the approvals forgets what scripts set too: a value kept after is one nobody approved. */
async function forget(deps: HandlerScripts): Promise<Result<Empty>> {
    await deps.approvals.forgetAll();
    deps.variables.forget();

    return success({});
}

function clearVariables(deps: HandlerScripts, workspaceId: string): Result<Empty> {
    const repo = activeRepo();

    if (!repo.ok) {
        return repo;
    }

    deps.variables.clear({ origin: repo.value.id, workspaceId });

    return success({});
}

async function writeSwitch(deps: ScriptsHandlerDeps, enabled: boolean): Promise<Result<Empty>> {
    await deps.scriptsSwitch.set(enabled);

    return success({});
}

/**
 * The only way a script becomes approved. The origin is the one that is open, never one the
 * window says; the text is hashed here, when it is asked, and never read again from disk. Copying,
 * moving, importing, a `pull` and the generic write of a collection do not come through here.
 */
export function registerScriptsHandlers(ipc: HandlerIpc, deps: HandlerScripts): () => void {
    ipc.handle(CHANNELS.scriptsApprove, async (_event, raw) => {
        const request = checkedRequest(scriptsApproveRequestSchema, raw);

        return request.ok ? approve(deps, request.value) : request;
    });
    ipc.handle(CHANNELS.scriptsStatus, async (_event, raw) => {
        const request = checkedRequest(scriptsStatusRequestSchema, raw);

        return request.ok ? status(deps, request.value) : request;
    });
    ipc.handle(CHANNELS.scriptsForget, async (_event, raw) => {
        const request = checkedRequest(scriptsForgetRequestSchema, raw ?? {});

        return request.ok ? forget(deps) : request;
    });
    ipc.handle(CHANNELS.scriptsSwitchRead, (_event, raw) => {
        const request = checkedRequest(NO_REQUEST, raw ?? {});

        return Promise.resolve(
            request.ok ? success({ enabled: deps.scriptsSwitch.enabled() }) : request,
        );
    });
    ipc.handle(CHANNELS.scriptsSwitchWrite, async (_event, raw) => {
        const request = checkedRequest(scriptsSwitchWriteRequestSchema, raw);

        return request.ok ? writeSwitch(deps, request.value.enabled) : request;
    });
    ipc.handle(CHANNELS.scriptsClearVariables, (_event, raw) => {
        const request = checkedRequest(scriptsClearVariablesRequestSchema, raw);

        return Promise.resolve(
            request.ok ? clearVariables(deps, request.value.workspaceId) : request,
        );
    });

    return () => {
        ipc.removeHandler(CHANNELS.scriptsApprove);
        ipc.removeHandler(CHANNELS.scriptsStatus);
        ipc.removeHandler(CHANNELS.scriptsForget);
        ipc.removeHandler(CHANNELS.scriptsSwitchRead);
        ipc.removeHandler(CHANNELS.scriptsSwitchWrite);
        ipc.removeHandler(CHANNELS.scriptsClearVariables);
    };
}
