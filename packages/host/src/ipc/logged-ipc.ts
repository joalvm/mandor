import { type ErrorCode, errorCodeSchema } from '@mandor/ipc';
import { z } from 'zod';

import type { Logger } from '../log/create-logger.js';
import type { LogLevel } from '../log/log-level.js';
import { failureOf } from './failure-of.js';
import type { HandlerIpc } from './handler-ipc.js';

/** The shape of a refusal as it crosses the bridge; the rest of the answer is not read. */
const failedAnswerSchema = z.object({
    ok: z.literal(false),
    error: z.object({ code: errorCodeSchema, message: z.string() }),
});

type Failure = z.infer<typeof failedAnswerSchema>['error'];

/**
 * The refusals worth a line, and how loud. A fault of the disk or of git is something that went
 * wrong under the user, and the window only says its code; an answer the user gave or a name
 * that was taken is not a fault, and the interface already says all there is.
 */
const LEVEL_OF_CODE: Partial<Record<ErrorCode, LogLevel>> = {
    unknown: 'error',
    'fs-read': 'warn',
    'fs-write': 'warn',
    'git-failed': 'warn',
    'git-missing': 'warn',
    'git-not-a-repo': 'warn',
};

/** The failure an answer carries, read off whatever the handler handed back. */
function failureIn(answer: unknown): Failure | null {
    const read = failedAnswerSchema.safeParse(answer);

    return read.success ? read.data.error : null;
}

function describeThrown(error: unknown): string {
    return error instanceof Error ? (error.stack ?? error.message) : String(error);
}

/**
 * Wraps `ipcMain` so nothing that goes wrong in a channel goes unwritten. A handler that throws
 * outside its own `try` answers the failure the renderer can read instead of a rejected
 * invoke, and its stack goes to the log with the channel; an answer that is already a fault
 * (unknown, or one of the disk or of git) is written too, because the renderer only gets the
 * code and the log is the only place left to look. The stack lives in the log alone: the log
 * redacts what it writes.
 */
export function loggedIpc(ipc: HandlerIpc, logger: Logger): HandlerIpc {
    return {
        handle: (channel, listener) => {
            ipc.handle(channel, async (event, payload) => {
                try {
                    const answer = await listener(event, payload);
                    const failed = failureIn(answer);
                    const level = failed === null ? undefined : LEVEL_OF_CODE[failed.code];

                    if (failed !== null && level !== undefined) {
                        logger.log(level, `${channel} answered ${failed.code}: ${failed.message}`);
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
