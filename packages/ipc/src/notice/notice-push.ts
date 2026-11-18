import { z } from 'zod';

import { resultSchema } from '../result/result-schema.js';

/**
 * What main can tell the person without words of its own: a code the window translates. Main
 * never sends a sentence, so the language of the interface stays the window's. The enum grows
 * with the first module that has something to say.
 */
export const noticeCodeSchema = z.enum([
    'files-unreadable',
    'files-unreadable-unnamed',
    'keychain-missing',
    'main-fault',
    'update-failed',
    'window-restarted',
]);

export type NoticeCode = z.infer<typeof noticeCodeSchema>;

/** The values a translation can interpolate. A list is joined by the window, in its language. */
const noticeParamSchema = z.union([z.string(), z.number(), z.array(z.string())]);

export type NoticeParam = z.infer<typeof noticeParamSchema>;

/**
 * One notice raised in main. `id` counts the notices of a window, so a notice that arrives by
 * the list and again by the push is the same one; `key` folds repeats into a single toast.
 */
export type NoticePush = {
    id: number;
    code: NoticeCode;
    tone: 'error' | 'info' | 'warning';
    key?: string | undefined;
    params?: Record<string, NoticeParam> | undefined;
};

export const noticePushSchema = z
    .object({
        id: z.number().int().positive(),
        code: noticeCodeSchema,
        tone: z.enum(['error', 'info', 'warning']),
        key: z.string().min(1).optional(),
        params: z.record(z.string(), noticeParamSchema).optional(),
    })
    .strict() satisfies z.ZodType<NoticePush>;

export const noticeListResultSchema = resultSchema(z.array(noticePushSchema));
