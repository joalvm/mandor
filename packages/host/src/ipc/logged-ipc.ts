import type { Result } from '@mandor/ipc';

import type { Logger } from '../log/create-logger.js';
import { failureOf } from './failure-of.js';
import type { HandlerIpc } from './handler-ipc.js';

function isUnknownFailure(answer: unknown): answer is Extract<Result<unknown>, { ok: false }> {
    return (
        typeof answer === 'object' &&
        answer !== null &&
        'ok' in answer &&
        answer.ok === false &&
        'error' in answer &&
        typeof answer.error === 'object' &&
        answer.error !== null &&
        'code' in answer.error &&
        answer.error.code === 'unknown'
    );
}

function describeThrown(error: unknown): string {
    return error instanceof Error ? (error.stack ?? error.message) : String(error);
}

/**
 * Wraps `ipcMain` so nothing that goes wrong in a channel goes unwritten. A handler that throws
 * outside its own `try` answers the failure the renderer can read instead of a rejected
 * invoke, and its stack goes to the log with the channel; an answer that is already an unknown
 * failure is written too, because the renderer only gets the code and the log is the only place
 * left to look. The stack lives in the log alone: the log redacts what it writes.
 */
export function loggedIpc(ipc: HandlerIpc, logger: Logger): HandlerIpc {
    return {
        handle: (channel, listener) => {
            ipc.handle(channel, async (event, payload) => {
                try {
                    const answer = await listener(event, payload);

                    if (isUnknownFailure(answer)) {
                        logger.log('error', `${channel} answered unknown: ${answer.error.message}`);
                    }

                    return answer;
                } catch (error) {
                    logger.log('error', `${channel} threw: ${describeThrown(error)}`);

                    return failureOf(error);
                }
            });
        },
        removeHandler: (channel) => {
            ipc.removeHandler(channel);
        },
    };
}
