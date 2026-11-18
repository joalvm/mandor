import { randomUUID } from 'node:crypto';
import type { Worker } from 'node:worker_threads';

import type { ScriptError } from '@mandor/schema';
import { SCRIPT_LIMITS, workerMessageSchema, type WorkerMessage } from '@mandor/script';

import { startRunDeadline, type RunDeadline } from './run-deadline.js';
import { newRunProtocol, rulesOf, type RunProtocol } from './run-protocol.js';
import { failedReply } from './send-reply.js';
import { failureOf, listen, type Listeners } from './worker-events.js';

type Kind = WorkerMessage['kind'];
type Done = Extract<WorkerMessage, { kind: 'done' }>;

type Failed = Extract<WorkerMessage, { kind: 'failed' }>;

/** A failure is the script's own error, or the reason main cut the worker. */
export type ScriptOutcome = { ok: true; output: string } | { ok: false; error: ScriptError };

export type RunSettings = {
    /** How long the worker may take to make its engine and begin the script. */
    startMs: number;
    /** The time of the script itself, from the moment the worker begins it. */
    runMs: number;
    /** What main adds on top, for the worker to hand over the `done` of a script that timed out. */
    slackMs: number;
    /** The most bytes of UTF-8 the output, or the error as JSON, may have. */
    outputBytes: number;
    /** Answers a `send` of the guest. Without it every `send` is a violation. */
    onSend?: ((payload: string, signal: AbortSignal) => Promise<string>) | undefined;
};

/** How a run ended and whether its worker may take another one: only a clean `done` allows it. */
export type Finished = { outcome: ScriptOutcome; reuse: boolean };

type Session = {
    worker: Worker;
    runId: string;
    protocol: RunProtocol;
    deadline: RunDeadline;
    settings: RunSettings;
    /** Ends when the run does, however it does: a send in flight must not outlive it. */
    sending: AbortController;
    settled: boolean;
    finish(outcome: ScriptOutcome, reuse: boolean): void;
};

/** Ends the run on an error of ours; `limit` is the bound it went past, when there is one. */
function cut(session: Session, errorName: string, message: string, limit?: number): void {
    const error = { message, errorName, ...(limit === undefined ? {} : { limit }) };

    session.finish({ ok: false, error }, false);
}

function violation(session: Session, reason: string): void {
    cut(session, 'Violation', `The script worker broke the protocol: ${reason}`);
}

/** Cuts the run when what the worker ended it with has more bytes than an output may have. */
function oversized(session: Session, what: string, text: string): boolean {
    const limit = session.settings.outputBytes;

    if (Buffer.byteLength(text) <= limit) {
        return false;
    }

    violation(session, `the ${what} is bigger than ${String(limit)} bytes`);

    return true;
}

function onFailed(session: Session, message: Failed): void {
    if (!oversized(session, 'error', JSON.stringify(message.error))) {
        session.finish({ ok: false, error: message.error }, message.fault === undefined);
    }
}

function onDone(session: Session, message: Done): void {
    if (!oversized(session, 'output', message.output)) {
        session.finish({ ok: true, output: message.output }, true);
    }
}

/** Gives the worker the answer to a send, if the guest still waits on it and the run is going. */
function answer(session: Session, sendId: string, reply: string): void {
    if (session.settled || !session.protocol.deliver(sendId).ok) {
        return;
    }

    // The clock of main stays stopped while any send is unanswered, even when the guest goes on
    // with the answer of another one. That time is still bounded: the clock of the guest, inside
    // the engine, counts every moment its code runs and stops the script at the limit.
    if (session.protocol.pendingSends === 0) {
        session.deadline.resume();
    }

    session.worker.postMessage({ kind: 'sent', runId: session.runId, sendId, reply });
}

function onSend(session: Session, message: Extract<WorkerMessage, { kind: 'send' }>): void {
    const { settings, sending, protocol } = session;

    if (settings.onSend === undefined) {
        violation(session, 'the script asked for a send, and this run admits none');

        return;
    }

    if (protocol.overQuota) {
        const limit = String(SCRIPT_LIMITS.sendRequestsPerRun);

        answer(session, message.sendId, failedReply(`A script may send ${limit} requests per run`));

        return;
    }

    settings.onSend(message.payload, sending.signal).then(
        (reply) => {
            answer(session, message.sendId, reply);
        },
        (cause: unknown) => {
            cut(session, 'SendFailed', cause instanceof Error ? cause.message : String(cause));
        },
    );
}

/** `run` and `sent` go to the worker, and the protocol refuses them before they get here. */
function wrongWay(session: Session): void {
    violation(session, 'a message went the wrong way');
}

const FROM_WORKER: {
    [K in Kind]: (session: Session, message: Extract<WorkerMessage, { kind: K }>) => void;
} = {
    run: wrongWay,
    sent: wrongWay,
    started: (session) => {
        const { runMs, slackMs } = session.settings;

        session.deadline.clear();
        session.deadline = startRunDeadline(runMs + slackMs, () => {
            cut(session, 'Timeout', `The script ran longer than ${String(runMs)} ms`, runMs);
        });
    },
    waiting: (session) => {
        // The answer may have come before this message does: then there is nothing to wait out.
        if (session.protocol.pendingSends > 0) {
            session.deadline.pause();
        }
    },
    send: onSend,
    done: onDone,
    failed: onFailed,
};

function receive(session: Session, value: unknown): void {
    const parsed = workerMessageSchema.safeParse(value);

    if (!parsed.success) {
        violation(session, 'a message is not of the protocol');

        return;
    }

    const verdict = session.protocol.receive(parsed.data);

    if (!verdict.ok) {
        violation(session, verdict.reason);

        return;
    }

    (FROM_WORKER[parsed.data.kind] as (session: Session, message: WorkerMessage) => void)(
        session,
        parsed.data,
    );
}

function listenersOf(session: Session): Listeners {
    return {
        message: (value: unknown): void => {
            receive(session, value);
        },
        messageerror: (): void => {
            violation(session, 'a message could not be read');
        },
        error: (error: Error): void => {
            const { errorName, message } = failureOf(error);

            cut(session, errorName, message);
        },
        exit: (code: number): void => {
            cut(session, 'WorkerDied', `The script worker exited with code ${String(code)}`);
        },
    };
}

type Run = { worker: Worker; signal: AbortSignal; settings: RunSettings; input: string };

function openSession(run: Run, resolve: (finished: Finished) => void): Session {
    const { worker, signal, settings, input } = run;
    const runId = randomUUID();
    const cancel = (): void => {
        cut(session, 'Cancelled', 'The run was cancelled');
    };

    const session: Session = {
        worker,
        runId,
        protocol: newRunProtocol(runId, rulesOf(input)),
        deadline: startRunDeadline(settings.startMs, () => {
            cut(session, 'Timeout', 'The script worker did not start the script in time');
        }),
        settings,
        sending: new AbortController(),
        settled: false,
        finish(outcome, reuse) {
            if (session.settled) {
                return;
            }

            session.settled = true;
            session.sending.abort();
            session.deadline.clear();
            signal.removeEventListener('abort', cancel);

            listen(worker, listeners, 'off');
            resolve({ outcome, reuse });
        },
    };
    const listeners = listenersOf(session);

    listen(worker, listeners, 'on');
    signal.addEventListener('abort', cancel, { once: true });

    return session;
}

/**
 * Sends one script to a worker and waits for how it ends, which is never a rejection: a script
 * that throws, a worker that dies or lies, a clock that runs out and a cancel all come back as an
 * outcome. The worker is for the caller to give back, and to end when `reuse` is false.
 */
export function runOnWorker(
    worker: Worker,
    input: string,
    signal: AbortSignal,
    settings: RunSettings,
): Promise<Finished> {
    return new Promise<Finished>((resolve) => {
        const session = openSession({ worker, signal, settings, input }, resolve);

        if (signal.aborted) {
            cut(session, 'Cancelled', 'The run was cancelled');

            return;
        }

        worker.postMessage({ kind: 'run', runId: session.runId, input });
    });
}
