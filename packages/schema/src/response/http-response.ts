import { z } from 'zod';

import { responseBodySchema } from './response-body.js';

const durationSchema = z.number().nonnegative();
const countSchema = z.number().int().nonnegative();

/** One cookie a response set, as its `Set-Cookie` line said it. */
export const responseCookieSchema = z
    .object({
        name: z.string(),
        value: z.string(),
        domain: z.string().optional(),
        path: z.string().optional(),
        expires: z.string().optional(),
        httpOnly: z.boolean(),
        secure: z.boolean(),
        sameSite: z.enum(['strict', 'lax', 'none']).optional(),
    })
    .strict();

/** The connection that carried a response; absent in history written before it was kept. */
const responseNetworkSchema = z
    .object({
        localAddress: z.string(),
        localPort: countSchema,
        remoteAddress: z.string(),
        remotePort: countSchema,
        tls: z
            .object({
                protocol: z.string(),
                cipher: z.string(),
                subject: z.string().optional(),
                issuer: z.string().optional(),
                validTo: z.string().optional(),
            })
            .strict()
            .optional(),
    })
    .strict();

/**
 * An HTTP response at rest: what the panel shows and what the history writes to disk. Headers
 * are a list in wire order, repeated names included. The field names are the ones the transport
 * of Sync uses for the same things, so nothing is renamed on the way across.
 */
export const httpResponseSchema = z
    .object({
        status: z.number().int().min(100).max(599),
        statusText: z.string(),
        httpVersion: z.enum(['1.1', '2']),
        headers: z.array(z.tuple([z.string(), z.string()])),
        body: responseBodySchema.nullable(),
        sizes: z
            .object({
                transferredBytes: countSchema,
                bodyBytes: countSchema,
                decoded: z.boolean(),
                /** Heads counted as HTTP/1.1 text; absent in history written before they were. */
                headerBytes: countSchema.optional(),
                requestHeaderBytes: countSchema.optional(),
                requestBodyBytes: countSchema.optional(),
            })
            .strict(),
        timings: z
            .object({
                dnsMs: durationSchema,
                connectMs: durationSchema,
                tlsMs: durationSchema,
                firstByteMs: durationSchema,
                totalMs: durationSchema,
                viaProxy: z.boolean(),
            })
            .strict(),
        redirects: z.array(
            z
                .object({
                    status: z.number().int(),
                    from: z.string(),
                    to: z.string(),
                    strippedHeaders: z.array(z.string()),
                })
                .strict(),
        ),
        cookies: z.array(responseCookieSchema),
        network: responseNetworkSchema.optional(),
        /** What a GraphQL answer said went wrong inside its 200; only set for a `graphql` send. */
        graphqlErrors: z
            .object({ count: countSchema, messages: z.array(z.string()) })
            .strict()
            .optional(),
    })
    .strict();

export type HttpResponse = z.infer<typeof httpResponseSchema>;
export type ResponseCookie = z.infer<typeof responseCookieSchema>;
