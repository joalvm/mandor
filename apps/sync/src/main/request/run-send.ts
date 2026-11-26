import {
    activeRepo,
    type EnvironmentPlace,
    type NetworkFor,
    type ReadSecretValue,
} from '@mandor/host';
import {
    failure,
    requestSendRequestSchema,
    success,
    type RequestSendRequest,
    type Result,
} from '@mandor/ipc';
import type { HttpResponse } from '@mandor/schema';

import type { CookieJarStore } from '../cookies/cookie-jar-store.js';
import { bodyHold, type BodyHold } from './body-holds.js';
import { dispatchItem } from './dispatch-item.js';
import { failureOfSend } from './failure-of-send.js';
import type { SendGuard } from './guarded-resolution.js';
import { scriptsBeforeSend, type SendScripts } from './request-scripts.js';
import { responseText, scriptsOnResponse } from './response-scripts.js';
import { scriptOutputPush, type SendMarks } from './script-output-push.js';
import { scriptPlaceOf, type ScriptsOutput } from './send-chain.js';
import type { SendObserver, SentRequest } from './send-event.js';
import { httpResponseOf } from './response-of.js';

/** What a send asks of the app: how a kept value is read and how a url reaches the network. */
export type SendDeps = {
    readSecret: ReadSecretValue;
    networkFor: NetworkFor;
    /** The jars of the environments. Absent, no send carries or keeps a cookie. */
    cookieJars?: CookieJarStore | undefined;
    /** Told how every send ended, once. Absent, nobody is told: a send needs no watcher. */
    afterSend?: SendObserver | undefined;
    /** Where a failure that must not cost the send its answer is written down: the log. */
    warn?: ((message: string) => void) | undefined;
};

/** The sends in flight, by the id the window gave them: how a cancel finds its request. */
export type Inflight = Map<string, AbortController>;

/**
 * The send as it goes: its signal, what left and the marks of its guard, filled so a watcher and
 * the window see them even if it fails.
 */
type Trace = { signal: AbortSignal; sent: SentRequest | undefined; hold: BodyHold } & SendMarks;

/** A send once its scripts ran: what the window asked, and the guard it resolves with. */
type Guarded = { input: RequestSendRequest; guard: SendGuard };

async function dispatch(
    deps: SendDeps,
    place: EnvironmentPlace,
    { input, guard }: Guarded,
    // The trace itself, never a copy: what left is written on it for the watcher.
    trace: Trace,
): Promise<Result<HttpResponse>> {
    const session = await deps.cookieJars?.session({
        root: place.root,
        workspaceId: input.workspaceId,
        environmentId: input.environmentId,
    });
    const context = {
        place,
        networkFor: deps.networkFor,
        cookies: session?.port,
        hold: trace.hold,
        guard,
        onSent: (sent: SentRequest) => {
            trace.sent = sent;
        },
        onGuarded: (guarded: SendMarks['guarded']) => {
            trace.guarded = guarded;
        },
    };

    try {
        const { request } = guard.applied;
        const dispatched = await dispatchItem(context, { ...input, request }, {}, trace.signal);

        if (!dispatched.ok) {
            return dispatched;
        }

        trace.heldAt = dispatched.value.response.heldAt;

        const { bodyType, response, url } = dispatched.value;

        return success(httpResponseOf(response, new Date(), bodyType, url));
    } finally {
        // What a 3xx or a failed send set before it died is the jar's all the same. A jar that
        // cannot be kept costs the next send its cookies, never this one the answer that came.
        await session?.finish().catch((error: unknown) => {
            deps.warn?.(`cookies: ${error instanceof Error ? error.message : 'not kept'}`);
        });
    }
}

function tell(
    deps: SendScripts,
    at: { sendId: string; phase: 'before' | 'response' },
    output: ScriptsOutput | undefined,
    trace: Trace,
): void {
    deps.tell?.(scriptOutputPush(at, output, trace));
}

/**
 * Launches the scripts of `onResponse` and lets the answer go without them. The body they read
 * is taken now, while the send holds it. The chain is counted in flight until it ends, so the next
 * send of the same place waits for what it sets.
 */
async function launchOnResponse(
    deps: SendScripts,
    place: EnvironmentPlace,
    { input, guard }: Guarded,
    trace: Trace & { response: HttpResponse },
): Promise<void> {
    const at = scriptPlaceOf(place, input);
    const answered = {
        guard,
        sent: trace.sent,
        response: trace.response,
        text: await responseText(place.root, trace.response.body),
    };
    const run = scriptsOnResponse(deps, at, answered, trace.signal).then(
        (output) => {
            tell(deps, { sendId: input.sendId, phase: 'response' }, output, trace);
        },
        (error: unknown) => {
            deps.logger.log('error', `the scripts of an answer ended: ${String(error)}`);
        },
    );

    deps.inFlight.track(at, run);
}

/**
 * The scripts of `onBeforeRequest`, then the send, unless a script kept it from leaving; then
 * those of `onResponse`, once there is an answer. The window hears what each phase said.
 */
async function sendWithScripts(
    deps: SendDeps & SendScripts,
    place: EnvironmentPlace,
    input: RequestSendRequest,
    trace: Trace,
): Promise<Result<HttpResponse>> {
    const before = await scriptsBeforeSend(deps, place, input, trace.signal);
    const phase = { sendId: input.sendId, phase: 'before' } as const;

    if (!before.result.ok) {
        tell(deps, phase, before.output, trace);

        return before.result;
    }

    const guarded = { input, guard: before.result.value };
    let answer: Result<HttpResponse>;

    try {
        answer = await dispatch(deps, place, guarded, trace);
    } finally {
        tell(deps, phase, before.output, trace);
    }

    if (answer.ok && input.skipScripts !== true) {
        await launchOnResponse(deps, place, guarded, { ...trace, response: answer.value });
    }

    return answer;
}

/**
 * Sends the request the window shows and answers its response. The request is resolved in main,
 * against the environment, from what the window wrote: the renderer never chooses what gets
 * dialed. Whatever goes wrong comes back as a refusal with a code of its own.
 */
export async function runSend(
    deps: SendDeps & SendScripts,
    inflight: Inflight,
    raw: unknown,
): Promise<Result<HttpResponse>> {
    const input = requestSendRequestSchema.safeParse(raw);

    if (!input.success) {
        return failure('bad-request', input.error.message);
    }

    const repo = activeRepo();

    if (!repo.ok) {
        return repo;
    }

    const controller = new AbortController();
    const place = { root: repo.value.root, repo: repo.value.id, readSecret: deps.readSecret };
    const startedAt = new Date();
    const trace: Trace = { signal: controller.signal, sent: undefined, hold: bodyHold(place.root) };
    let outcome: Result<HttpResponse>;

    inflight.set(input.data.sendId, controller);

    try {
        outcome = await sendWithScripts(deps, place, input.data, trace);
    } catch (error) {
        outcome = failureOfSend(error);
    } finally {
        inflight.delete(input.data.sendId);
    }

    try {
        await deps.afterSend?.({
            root: place.root,
            input: input.data,
            startedAt,
            sent: trace.sent,
            outcome,
            hold: trace.hold,
        });
    } finally {
        trace.hold.release();
    }

    return outcome;
}
