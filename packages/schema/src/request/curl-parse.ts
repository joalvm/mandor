import { z } from 'zod';

import { authConfigSchema } from '../auth/auth-config-schema.js';
import { CURL_INVALID_REASONS, curlNoticeSchema } from './curl-notice.js';
import {
    maxRedirectsSchema,
    requestBodySchema,
    requestLineSchema,
    requestMethodSchema,
    timeoutMsSchema,
} from './request-item-schema.js';

/**
 * The settings a curl names, and only those: a field that is absent stays absent, so pasting
 * never resets what the request already had.
 */
export const curlSettingsSchema = z
    .object({
        timeoutMs: timeoutMsSchema.optional(),
        followRedirects: z.boolean().optional(),
        maxRedirects: maxRedirectsSchema.optional(),
        keepMethodOnRedirect: z.boolean().optional(),
        validateTls: z.boolean().optional(),
    })
    .strict();

const curlRequestSchema = z
    .object({
        method: requestMethodSchema,
        url: z.string().min(1),
        query: z.array(requestLineSchema),
        headers: z.array(requestLineSchema),
        body: requestBodySchema,
        settings: curlSettingsSchema,
        auth: authConfigSchema.optional(),
    })
    .strict();

export const curlParseSchema = z.discriminatedUnion('kind', [
    z
        .object({
            kind: z.literal('parsed'),
            request: curlRequestSchema,
            notices: z.array(curlNoticeSchema),
        })
        .strict(),
    z
        .object({
            kind: z.literal('invalid'),
            reason: z.enum(CURL_INVALID_REASONS),
            subject: z.string().optional(),
        })
        .strict(),
]);
export type CurlRequest = z.infer<typeof curlRequestSchema>;
export type CurlParse = z.infer<typeof curlParseSchema>;
