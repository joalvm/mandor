import { z } from 'zod';

import type { Empty, Result } from '../result/result.js';

/**
 * Where in the window a fault was seen: the log reads it to tell a render error from a promise
 * the window let go of on purpose and one nobody caught.
 */
export const LOG_SOURCES = [
    'react-uncaught',
    'react-caught',
    'react-recoverable',
    'window-error',
    'unhandled-rejection',
    'unawaited',
] as const;

/** The ceilings of a line from the window: a fault is a sentence and a stack, not a document. */
export const LOG_MESSAGE_MAX = 2048;
export const LOG_STACK_MAX = 8192;

const logSourceSchema = z.enum(LOG_SOURCES);

export type LogSource = z.infer<typeof logSourceSchema>;

export const logWriteRequestSchema = z
    .object({
        level: z.enum(['warn', 'error']),
        source: logSourceSchema,
        message: z.string().max(LOG_MESSAGE_MAX),
        stack: z.string().max(LOG_STACK_MAX).optional(),
    })
    .strict();

export type LogWriteRequest = z.infer<typeof logWriteRequestSchema>;

/**
 * The way a fault of the window reaches the log of the app. Nothing else of the log crosses:
 * the window can add a line, never read or clear one.
 */
export type LogArea = {
    /** Hands main a line to write. Nobody waits for it: a fault that cannot be told is lost. */
    write: (input: LogWriteRequest) => Promise<Result<Empty>>;
};
