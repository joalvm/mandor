import { z } from 'zod';

import type { AuthConfig, ConcreteAuth } from './auth-config.js';
import { API_KEY_PLACEMENTS } from './api-key-placement.js';

const inheritAuthSchema = z.object({ inherit: z.literal(true) }).strict();

const noAuthSchema = z.object({ type: z.literal('none') }).strict();

const basicAuthSchema = z
    .object({
        type: z.literal('basic'),
        username: z.string(),
        password: z.string(),
    })
    .strict();

const bearerAuthSchema = z
    .object({
        type: z.literal('bearer'),
        token: z.string(),
        prefix: z.string().optional(),
    })
    .strict();

const apiKeyAuthSchema = z
    .object({
        type: z.literal('apikey'),
        // The name travels as a header name, a query key or a cookie name: no spaces, no colon.
        name: z.string().regex(/^[^\s:]+$/),
        value: z.string(),
        in: z.enum(API_KEY_PLACEMENTS),
    })
    .strict();

const digestAuthSchema = z
    .object({
        type: z.literal('digest'),
        username: z.string(),
        password: z.string(),
    })
    .strict();

const awsSigV4AuthSchema = z
    .object({
        type: z.literal('awsv4'),
        accessKeyId: z.string(),
        secretAccessKey: z.string(),
        region: z.string().optional(),
        service: z.string().optional(),
        sessionToken: z.string().optional(),
    })
    .strict();

const clientCredentialsSchema = z
    .object({
        type: z.literal('oauth2-client-credentials'),
        tokenUrl: z.string(),
        clientId: z.string(),
        clientSecret: z.string(),
        clientAuth: z.enum(['basic', 'body']),
        scope: z.string().optional(),
        audience: z.string().optional(),
    })
    .strict();

/**
 * The port the loopback server of a code flow listens on: below 1024 it needs privileges, above
 * 65535 it does not exist.
 */
export const redirectPortSchema = z.number().int().min(1024).max(65535);

const codePkceSchema = z
    .object({
        type: z.literal('oauth2-code-pkce'),
        authorizationUrl: z.string(),
        tokenUrl: z.string(),
        clientId: z.string(),
        clientSecret: z.string().optional(),
        scope: z.string().optional(),
        redirectPort: redirectPortSchema.optional(),
    })
    .strict();

/** One concrete scheme: what a level says when it decides, and never `inherit`. */
export const concreteAuthSchema = z.discriminatedUnion('type', [
    noAuthSchema,
    basicAuthSchema,
    bearerAuthSchema,
    apiKeyAuthSchema,
    digestAuthSchema,
    awsSigV4AuthSchema,
    clientCredentialsSchema,
    codePkceSchema,
]) satisfies z.ZodType<ConcreteAuth>;

/** One level of the auth chain as the file carries it: inherit, or one concrete scheme. */
export const authConfigSchema = z.union([
    inheritAuthSchema,
    concreteAuthSchema,
]) satisfies z.ZodType<AuthConfig>;
