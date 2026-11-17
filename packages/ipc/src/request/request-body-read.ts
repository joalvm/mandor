import { z } from 'zod';

import { resultSchema } from '../result/result-schema.js';

/** The most one window of a stored body may carry: the viewer never asks for the whole file. */
export const BODY_WINDOW_BYTES = 262_144;

/** The most the viewer formats of a body; past it the text is shown as it came and says so. */
export const FORMAT_BYTES = 5_242_880;

/**
 * One window of a body main wrote to disk. The reference is the hash that names the file, never
 * a path: the renderer cannot make main open anything the app did not write.
 */
export const requestBodyReadRequestSchema = z
    .object({
        ref: z.string().regex(/^[a-f0-9]{64}$/),
        offset: z.number().int().nonnegative(),
        length: z.number().int().positive().max(BODY_WINDOW_BYTES),
    })
    .strict();

/** The window as text when its bytes are text, as base64 when they are not; `total` is the file. */
const bodyWindowSchema = z.discriminatedUnion('encoding', [
    z.object({ encoding: z.literal('utf8'), text: z.string(), total: z.number().int() }).strict(),
    z.object({ encoding: z.literal('base64'), data: z.string(), total: z.number().int() }).strict(),
]);

export const requestBodyReadResultSchema = resultSchema(bodyWindowSchema);

export type RequestBodyReadRequest = z.infer<typeof requestBodyReadRequestSchema>;
export type BodyWindow = z.infer<typeof bodyWindowSchema>;
