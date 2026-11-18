import type { SendAnswer, SendLink, WorkerMessage } from '@mandor/script';

/** What the worker posts to main: the one side of its port the link uses. */
type Outbox = { postMessage(message: WorkerMessage): void };

export type ScriptLink = {
    /** What the engine talks to main through. */
    link: SendLink;
    /** An answer main sent with `sent`: it goes to the engine that waits, or waits for it. */
    accept: (answer: SendAnswer) => void;
};

/**
 * The link of one run between the engine and main: its sends and its waits go out as messages of
 * the run, and the answers that come back are handed to the engine in the order they arrive.
 */
export function newScriptLink(runId: string, port: Outbox): ScriptLink {
    const arrived: SendAnswer[] = [];
    const waiting: ((answer: SendAnswer) => void)[] = [];

    return {
        link: {
            send(sendId, payload) {
                port.postMessage({ kind: 'send', runId, sendId, payload });
            },
            waiting() {
                port.postMessage({ kind: 'waiting', runId });
            },
            nextAnswer() {
                const answer = arrived.shift();

                return answer === undefined
                    ? new Promise<SendAnswer>((resolve) => waiting.push(resolve))
                    : Promise.resolve(answer);
            },
        },
        accept(answer) {
            const next = waiting.shift();

            if (next === undefined) {
                arrived.push(answer);

                return;
            }

            next(answer);
        },
    };
}
