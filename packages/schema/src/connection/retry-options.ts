import { z } from 'zod';

/**
 * How a connection comes back after the server hangs up. Every field stands alone: a file may
 * name one and not the others, and what is absent is the default. A first attempt that never
 * opened is not this policy's business — it covers a server that was there and stopped being.
 */
export type RetryOptions = {
    /** How many attempts the wait may be spent on. */
    attempts?: number | undefined;
    /** Whether the connection rearms itself at all. */
    enabled?: boolean | undefined;
    /** The wait before the first retry, doubled on every attempt after it. */
    initialWaitMs?: number | undefined;
    /** The wait never grows past this, however many attempts come before it. */
    maximumWaitMs?: number | undefined;
    /** Randomizes the wait by this fraction either way, between 0 and 1. */
    spread?: number | undefined;
};

export const retryOptionsSchema = z
    .object({
        attempts: z.number().int().min(1).max(100).optional(),
        enabled: z.boolean().optional(),
        initialWaitMs: z.number().int().min(1).max(3_600_000).optional(),
        maximumWaitMs: z.number().int().min(1).max(86_400_000).optional(),
        spread: z.number().min(0).max(1).optional(),
    })
    // Both ends present, or neither: a ceiling below the first wait would end the growing
    // before it started, and the file that says so means something nobody can dial.
    .superRefine((options, context) => {
        const { initialWaitMs, maximumWaitMs } = options;

        if (
            initialWaitMs !== undefined &&
            maximumWaitMs !== undefined &&
            maximumWaitMs < initialWaitMs
        ) {
            context.addIssue({ code: 'custom', message: 'maximumWaitMs', path: ['maximumWaitMs'] });
        }
    });

/** What a connection without a policy of its own retries by. */
export const DEFAULT_RETRY_OPTIONS = {
    attempts: 5,
    enabled: true,
    initialWaitMs: 500,
    maximumWaitMs: 8_000,
    spread: 0.2,
} satisfies RetryOptions;
