import { z } from 'zod';

import { authConfigSchema } from '../auth/auth-config-schema.js';
import { requestScriptsSchema } from '../script/own-scripts-schema.js';
import { bodyFilePathSchema } from './body-file-path-schema.js';
import { entityNameSchema } from '../fields/entity-name-schema.js';
import { responseCookieSchema } from '../response/http-response.js';
import { METHOD_PATTERN } from './request-methods.js';
import { keyValueMetaSchema } from './request-line-meta.js';
import type { RequestExample, RequestExampleOverrides } from './request-example.js';
import type { RequestItem } from './request-item.js';
import type { RequestLine } from './request-line.js';
import { HTTP_VERSIONS, TLS_VERSIONS, type RequestSettingsOverrides } from './request-settings.js';

/** One line as it is read: an empty key is a row half typed, and the writer takes it out. */
export const requestLineSchema = z.object({
    key: z.string(),
    value: z.string(),
    enabled: z.boolean().default(true),
    schema: z.string().optional(),
    required: z.boolean().optional(),
    description: z.string().optional(),
    meta: keyValueMetaSchema.optional(),
}) satisfies z.ZodType<RequestLine>;

/** The validators of the settings, each without its default, for whoever names only some of them. */
export const timeoutMsSchema = z.number().int().positive();
export const maxRedirectsSchema = z.number().int().nonnegative();
const httpVersionSchema = z.enum(HTTP_VERSIONS);
const tlsVersionSchema = z.enum(TLS_VERSIONS);

/**
 * What every request was written with before the defaults moved to the app: the four settings,
 * each at its old default. A block that says exactly that is a request nobody touched, and it
 * reads as one that keeps nothing of its own — so it follows the app like a new one does.
 */
const UNTOUCHED_SETTINGS = {
    followRedirects: true,
    maxRedirects: 5,
    timeoutMs: 30000,
    validateTls: true,
};

function withoutUntouched(value: unknown): unknown {
    const untouched =
        typeof value === 'object' &&
        value !== null &&
        JSON.stringify(Object.fromEntries(Object.entries(value).sort())) ===
            JSON.stringify(UNTOUCHED_SETTINGS);

    return untouched ? {} : value;
}

export const requestSettingsSchema = z.preprocess(
    withoutUntouched,
    z.object({
        timeoutMs: timeoutMsSchema.optional(),
        followRedirects: z.boolean().optional(),
        maxRedirects: maxRedirectsSchema.optional(),
        keepMethodOnRedirect: z.boolean().optional(),
        validateTls: z.boolean().optional(),
        httpVersion: httpVersionSchema.optional(),
        useCookieJar: z.boolean().optional(),
        followAuthorizationOnRedirect: z.boolean().optional(),
        maxResponseSizeMiB: z.number().int().nonnegative().max(1_048_576).optional(),
        tlsMinVersion: tlsVersionSchema.optional(),
        tlsMaxVersion: tlsVersionSchema.optional(),
        tlsCiphers: z.string().max(4096).optional(),
    }),
) satisfies z.ZodType<RequestSettingsOverrides>;

/** What a method may look like, as a validator: the one field `method` of the request uses. */
export const requestMethodSchema = z.string().regex(METHOD_PATTERN);

export const requestBodySchema = z.discriminatedUnion('type', [
    z.object({ type: z.literal('none') }),
    z.object({
        type: z.enum(['json', 'text', 'xml']),
        content: z.string().default(''),
    }),
    z.object({
        type: z.literal('urlencoded'),
        fields: z.array(requestLineSchema).default([]),
    }),
    z.object({
        type: z.literal('form'),
        fields: z.array(
            requestLineSchema.extend({
                kind: z.enum(['text', 'file']).default('text'),
            }),
        ),
    }),
    z.object({ type: z.literal('binary'), file: bodyFilePathSchema }),
    z.object({
        type: z.literal('graphql'),
        query: z.string().default(''),
        variables: z.string().default(''),
        operationName: z.string().optional(),
    }),
]);

/** What an example changes of its request: absent is inherited, so nothing here has a default. */
const requestExampleOverridesSchema = z.object({
    query: z.array(requestLineSchema).optional(),
    headers: z.array(requestLineSchema).optional(),
    pathParams: z.array(requestLineSchema).optional(),
    body: requestBodySchema.optional(),
    auth: authConfigSchema.optional(),
    settings: requestSettingsSchema.optional(),
    description: z.string().optional(),
}) satisfies z.ZodType<RequestExampleOverrides>;

const requestExampleSchema = z.object({
    name: z.string(),
    status: z.string(),
    contentType: z.string(),
    body: z.string(),
    headers: z.array(z.tuple([z.string(), z.string()])).optional(),
    cookies: z.array(responseCookieSchema).optional(),
    request: requestExampleOverridesSchema.optional(),
    schema: z.string().optional(),
}) satisfies z.ZodType<RequestExample>;

const requestItemFields = z.object({
    name: entityNameSchema,
    method: requestMethodSchema.default('GET'),
    url: z.string().default(''),
    query: z.array(requestLineSchema).default([]),
    headers: z.array(requestLineSchema).default([]),
    pathParams: z.array(requestLineSchema).default([]),
    body: requestBodySchema.default({ type: 'none' }),
    bodySchema: z.string().optional(),
    examples: z.array(requestExampleSchema).default([]),
    /** Where files written before the example owned its schema kept one per status. */
    responseSchemas: z.record(z.string(), z.string()).optional(),
    settings: requestSettingsSchema.default({}),
    description: z.string().optional(),
    auth: authConfigSchema.optional(),
    scripts: requestScriptsSchema.optional(),
});

/**
 * An old file kept one schema per status beside its examples: each example without one of its
 * own takes the one of its status, and the map leaves. A schema no example wore described no
 * answer anybody could see, and leaves with it.
 */
function withExampleSchemas({
    responseSchemas,
    ...request
}: z.output<typeof requestItemFields>): RequestItem {
    if (responseSchemas === undefined) {
        return request;
    }

    const examples = request.examples.map((example) => {
        const schema = example.schema ?? responseSchemas[example.status];

        return schema === undefined ? example : { ...example, schema };
    });

    return { ...request, examples };
}

/**
 * The request as one flat record, envelope name included. URL and lines may be empty: absent
 * says nobody wrote them yet, and the writer takes the empty ones out of the file.
 */
export const requestItemSchema = requestItemFields.transform(
    withExampleSchemas,
) satisfies z.ZodType<RequestItem>;
