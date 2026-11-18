import { API_BY_EVENT, SCRIPT_LIMITS, scriptEventSchema, type WorkerMessage } from '@mandor/script';

type Kind = WorkerMessage['kind'];

/** Whether a message fits the run as it stands; a refusal says why, and ends the worker. */
type Verdict = { ok: true } | { ok: false; reason: string };

/** What a run may ask of main: whether its event gives the script `sendRequest`, and how often. */
export type RunRules = { mayAsk: boolean; maxSends: number };

/**
 * The rules of a run from its input, the JSON text main sends to the worker. The event says
 * whether the script has `sendRequest`; an input that says no event is one that never sends.
 */
export function rulesOf(input: string): RunRules {
    return { mayAsk: asks(input), maxSends: SCRIPT_LIMITS.sendRequestsPerRun };
}

function asks(input: string): boolean {
    const event = scriptEventSchema.safeParse(eventIn(input));

    return event.success && API_BY_EVENT[event.data].objects.includes('sendRequest');
}

function eventIn(input: string): unknown {
    try {
        const parsed: unknown = JSON.parse(input);

        return typeof parsed === 'object' && parsed !== null && 'event' in parsed
            ? parsed.event
            : undefined;
    } catch {
        return undefined;
    }
}

/** The states of one run in main: where it stands and which sends the guest still waits on. */
export type RunProtocol = {
    /** A message the worker posted for this run. */
    receive(message: WorkerMessage): Verdict;
    /** Main is about to answer a send with `sent`: it must be one the guest still waits on. */
    deliver(sendId: string): Verdict;
    /** Sends the worker made that main has not answered. */
    readonly pendingSends: number;
    /** Whether the worker made more sends than the run admits, the one just received included. */
    readonly overQuota: boolean;
};

/** `unwaited`: sends the guest made and has not said it waits for yet. */
type RunState = {
    rules: RunRules;
    pending: Set<string>;
    unwaited: number;
    sends: number;
    started: boolean;
    finished: boolean;
};

const OK: Verdict = { ok: true };

function end(run: RunState): Verdict {
    run.finished = true;

    return OK;
}

function refuse(reason: string): Verdict {
    return { ok: false, reason };
}

/**
 * How each kind of message from the worker moves the run. `run` and `sent` go the other way, from
 * main to the worker, so the worker has no business posting them. Which kinds a state accepts is
 * this table and nothing else: a kind that is missing from it does not compile.
 */
const FROM_WORKER: {
    [K in Kind]: (run: RunState, message: Extract<WorkerMessage, { kind: K }>) => Verdict;
} = {
    run: () => refuse('the worker started a run'),
    sent: () => refuse('the worker answered a send, which only main does'),
    started: (run) => {
        if (run.started) {
            return refuse('the worker started the script twice');
        }

        run.started = true;

        return OK;
    },
    waiting: (run) => {
        if (run.unwaited === 0) {
            return refuse('the guest waits and made no send to wait for');
        }

        run.unwaited -= 1;

        return OK;
    },
    send: (run, message) => {
        if (!run.rules.mayAsk) {
            return refuse('the script asked for a send in an event that has none');
        }

        if (run.pending.has(message.sendId)) {
            return refuse(`the send ${message.sendId} was made twice`);
        }

        run.pending.add(message.sendId);
        run.unwaited += 1;
        run.sends += 1;

        return OK;
    },
    done: end,
    failed: end,
};

/** The protocol of one run, from the moment main sends `run` to the end the worker reports. */
export function newRunProtocol(runId: string, rules: RunRules): RunProtocol {
    const run: RunState = {
        rules,
        pending: new Set(),
        unwaited: 0,
        sends: 0,
        started: false,
        finished: false,
    };

    return {
        receive(message) {
            if (run.finished) {
                return refuse(`a ${message.kind} came after the run was done`);
            }

            if (message.runId !== runId) {
                return refuse(
                    `a ${message.kind} of the run ${message.runId} came in the run ${runId}`,
                );
            }

            return (
                FROM_WORKER[message.kind] as (run: RunState, message: WorkerMessage) => Verdict
            )(run, message);
        },
        deliver(sendId) {
            if (!run.pending.delete(sendId)) {
                return refuse(`the send ${sendId} is not one the guest waits on`);
            }

            return OK;
        },
        get pendingSends() {
            return run.pending.size;
        },
        get overQuota() {
            return run.sends > run.rules.maxSends;
        },
    };
}
