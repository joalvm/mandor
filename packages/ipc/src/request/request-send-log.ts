import { z } from 'zod';

import { errorCodeSchema } from '../result/error-code.js';

const headersSchema = z.array(z.tuple([z.string(), z.string()]));

/**
 * The most of a body the console is told, in characters: enough to read an answer, and a body
 * of megabytes never crosses to the window again for a line of the console.
 */
export const SEND_LOG_BODY_MAX = 64 * 1024;

const bodySchema = z.string().max(SEND_LOG_BODY_MAX).optional();

/**
 * Pushed to the window once a send ends, for its console: what left, and what came back or why
 * nothing did, as a browser writes every request of its page. `sent` is absent when the send
 * ended before anything was resolved. A body is there only when it reads as text, cut to its
 * first characters. Every text in it is already redacted in main.
 */
export const requestSendLogSchema = z
    .object({
        sendId: z.uuid(),
        sent: z
            .object({
                method: z.string(),
                url: z.string(),
                headers: headersSchema,
                body: bodySchema,
            })
            .strict()
            .optional(),
        answer: z
            .object({
                status: z.number().int().min(100).max(599),
                statusText: z.string(),
                totalMs: z.number().nonnegative(),
                bodyBytes: z.number().int().nonnegative(),
                headers: headersSchema,
                body: bodySchema,
            })
            .strict()
            .optional(),
        error: z.object({ code: errorCodeSchema, message: z.string() }).strict().optional(),
    })
    .strict();

export type RequestSendLog = z.infer<typeof requestSendLogSchema>;
