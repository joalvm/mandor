import type { Logger } from '../log/create-logger.js';
import type { NoticeOutbox } from '../notice/raise-notice.js';

/** The slice of `process` the host listens on, named structurally so a test needs no process. */
export type FaultTarget = {
    on: (event: FaultEvent, listener: (reason: unknown) => void) => unknown;
    off: (event: FaultEvent, listener: (reason: unknown) => void) => unknown;
};

type FaultEvent = 'uncaughtException' | 'unhandledRejection';

const EVENTS: readonly FaultEvent[] = ['uncaughtException', 'unhandledRejection'];

/** The key every fault of main shares: three of them in a row are one toast, not three. */
const KEY = 'main-fault';

function describeFault(reason: unknown): string {
    return reason instanceof Error ? (reason.stack ?? reason.message) : String(reason);
}

/**
 * Takes the faults nobody caught in main. With a listener Electron does not open its own dialog
 * with an English stack, and the process goes on: the stack goes to the log and the person is
 * told something failed, with the way to start over the notice offers. Main does not leave by
 * itself, because losing the work of someone who did not ask is worse than a state that may be
 * broken.
 */
export function watchProcessFaults(
    target: FaultTarget,
    logger: Logger,
    outbox: NoticeOutbox,
): () => void {
    const listeners = EVENTS.map((event) => {
        const listener = (reason: unknown): void => {
            logger.log('error', `${event}: ${describeFault(reason)}`);
            outbox.raise('main-fault', 'error', undefined, KEY);
        };

        target.on(event, listener);

        return [event, listener] as const;
    });

    return () => {
        for (const [event, listener] of listeners) {
            target.off(event, listener);
        }
    };
}
