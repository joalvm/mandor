import { z } from 'zod';

/**
 * What Insomnia reads a collection with: its parser is zod too, and it is not published apart, so
 * these are its shapes, copied from `insomnia-v5.ts` of its repository. Its objects drop what they
 * do not name, so a key here is one that Insomnia keeps; the ones it keeps untyped stay open.
 * Insomnia is on zod 3, where a key of `z.undefined().optional()` may be absent; zod 4 asks `.optional()`.
 */
const metaSchema = z.object({
    id: z.string(),
    created: z.number().optional(),
    modified: z.number().optional(),
    isPrivate: z.boolean().optional(),
    description: z.string().optional(),
    sortKey: z.number().optional(),
});

const headersSchema = z.array(
    z.object({
        name: z.string(),
        value: z.string(),
        description: z.string().optional(),
        disabled: z.boolean().optional(),
    }),
);

const parametersSchema = z.array(
    z.object({
        name: z.string(),
        value: z.string().optional(),
        description: z.string().optional(),
        disabled: z.boolean().optional(),
    }),
);

const scriptsSchema = z
    .object({ preRequest: z.string().optional(), afterResponse: z.string().optional() })
    .optional();

const authenticationSchema = z.record(z.string(), z.unknown()).optional();

const cookiesSchema = z.object({ send: z.boolean(), store: z.boolean() }).partial().optional();

const followRedirectsSchema = z.enum(['global', 'on', 'off']).optional();

const bodySchema = z
    .object({
        mimeType: z.string().nullable().optional(),
        text: z.string().optional(),
        fileName: z.string().optional(),
        params: z.array(z.record(z.string(), z.unknown())).optional(),
    })
    .optional();

const requestSchema = z.object({
    url: z.string(),
    name: z.string(),
    meta: metaSchema.optional(),
    method: z.string(),
    headers: headersSchema.optional(),
    parameters: parametersSchema.optional(),
    pathParameters: parametersSchema.nullable().optional(),
    body: bodySchema,
    authentication: authenticationSchema,
    scripts: scriptsSchema,
    settings: z
        .object({
            renderRequestBody: z.boolean().optional(),
            encodeUrl: z.boolean().optional(),
            followRedirects: followRedirectsSchema,
            rebuildPath: z.boolean().optional(),
            cookies: cookiesSchema,
        })
        .optional(),
    children: z.undefined().optional(),
});

const websocketSchema = z.object({
    url: z.string(),
    name: z.string(),
    meta: metaSchema.extend({ id: z.string().startsWith('ws-req') }).optional(),
    headers: headersSchema.optional(),
    parameters: parametersSchema.optional(),
    pathParameters: parametersSchema.nullable().optional(),
    authentication: authenticationSchema,
    settings: z
        .object({
            encodeUrl: z.boolean().optional(),
            followRedirects: followRedirectsSchema,
            useProxy: z.boolean().optional(),
            cookies: cookiesSchema,
        })
        .optional(),
    body: z
        .object({
            meta: metaSchema.extend({ id: z.string().startsWith('ws-payload') }).optional(),
            name: z.string().optional(),
            value: z.string().optional(),
            mode: z.string().optional(),
        })
        .optional(),
    children: z.undefined().optional(),
    method: z.undefined().optional(),
});

const socketIoSchema = z.object({
    url: z.string(),
    name: z.string(),
    meta: metaSchema.extend({ id: z.string().startsWith('socket-io-req') }).optional(),
    headers: headersSchema.optional(),
    parameters: parametersSchema.optional(),
    pathParameters: parametersSchema.nullable().optional(),
    authentication: authenticationSchema,
    eventListeners: z.array(z.record(z.string(), z.unknown())).optional(),
    body: z
        .object({
            meta: metaSchema.extend({ id: z.string().startsWith('socket-io-payload') }).optional(),
            eventName: z.string().optional(),
            ack: z.boolean().optional(),
            args: z
                .array(
                    z.object({
                        id: z.string(),
                        value: z.string().optional(),
                        mode: z.string().optional(),
                    }),
                )
                .optional(),
        })
        .optional(),
    children: z.undefined().optional(),
    method: z.undefined().optional(),
});

const groupSchema: z.ZodType = z.object({
    name: z.string(),
    meta: metaSchema.optional(),
    children: z.lazy(() => z.array(itemSchema)).optional(),
    headers: headersSchema.optional(),
    authentication: authenticationSchema,
    environment: z.record(z.string(), z.unknown()).optional(),
    environmentPropertyOrder: z.record(z.string(), z.unknown()).nullable().optional(),
    scripts: scriptsSchema,
    method: z.undefined().optional(),
    url: z.undefined().optional(),
    parameters: z.undefined().optional(),
    pathParameters: z.undefined().optional(),
});

const itemSchema: z.ZodType = z.union([
    requestSchema,
    websocketSchema,
    socketIoSchema,
    groupSchema,
]);

const levelOfEnvironment = {
    name: z.string(),
    meta: metaSchema.optional(),
    data: z.record(z.string(), z.unknown()).optional(),
    color: z.string().nullable().optional(),
    isPrivate: z.boolean().optional(),
    confidentialKeys: z.array(z.string()).optional(),
};

const environmentSchema = z.object({
    ...levelOfEnvironment,
    subEnvironments: z.array(z.object(levelOfEnvironment)).optional(),
});

export const insomniaCollectionSchema = z.object({
    schema_version: z.string().optional(),
    name: z.string().optional(),
    meta: metaSchema.optional(),
    environments: environmentSchema.optional(),
    type: z.literal('collection.insomnia.rest/5.0'),
    collection: z.array(itemSchema).optional(),
});
