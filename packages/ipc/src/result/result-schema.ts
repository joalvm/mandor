import { z } from 'zod';

import { errorCodeSchema } from './error-code.js';

/** Builds the validated wire answer for one channel payload. */
export function resultSchema<T>(valueSchema: z.ZodType<T>) {
    return z.discriminatedUnion('ok', [
        z.object({ ok: z.literal(true), value: valueSchema }).strict(),
        z
            .object({
                ok: z.literal(false),
                error: z.object({ code: errorCodeSchema, message: z.string() }).strict(),
            })
            .strict(),
    ]);
}

/** The answer of every call that has nothing to give back, like closing a socket. */
export const emptyResultSchema = resultSchema(z.object({}).strict());
