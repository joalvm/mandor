import { authConfigSchema, responseCookieSchema } from '@mandor/schema';
import { z } from 'zod';

import {
    INTEROP_PARAMETER_PLACES,
    type InteropExampleRequest,
    type InteropHttpOperation,
    type InteropParameter,
    type InteropRequestBody,
    type InteropResponseExample,
} from './interop-document.js';
import { interopBodyFieldSchema, interopScriptSchema } from './interop-tree-schema.js';

const line = z.string().regex(/\S/);

const interopParameterSchema = z
    .object({
        name: line,
        in: z.enum(INTEROP_PARAMETER_PLACES),
        required: z.boolean(),
        value: z.string(),
        schema: z.string().optional(),
        enabled: z.boolean().optional(),
    })
    .strict() satisfies z.ZodType<InteropParameter>;

const interopRequestBodySchema = z
    .object({
        contentType: line,
        value: z.string(),
        schema: z.string().optional(),
        required: z.boolean(),
        fields: z.array(interopBodyFieldSchema).optional(),
        variables: z.string().optional(),
    })
    .strict() satisfies z.ZodType<InteropRequestBody>;

const interopExampleRequestSchema = z
    .object({
        parameters: z.array(interopParameterSchema),
        requestBody: interopRequestBodySchema.optional(),
        auth: authConfigSchema.optional(),
        description: z.string().optional(),
    })
    .strict() satisfies z.ZodType<InteropExampleRequest>;

const interopResponseExampleSchema = z
    .object({
        name: line,
        status: z.string(),
        contentType: z.string(),
        body: z.string(),
        schema: z.string().optional(),
        headers: z.array(z.tuple([z.string(), z.string()])).optional(),
        cookies: z.array(responseCookieSchema).optional(),
        sentWith: interopExampleRequestSchema.optional(),
    })
    .strict() satisfies z.ZodType<InteropResponseExample>;

/** The part of an operation that speaks request and response: what only an HTTP document has. */
export const interopHttpOperationSchema = z
    .object({
        method: line,
        path: z.string(),
        summary: z.string().optional(),
        description: z.string().optional(),
        tags: z.array(line),
        parameters: z.array(interopParameterSchema),
        requestBody: interopRequestBodySchema.optional(),
        responses: z.array(interopResponseExampleSchema),
        security: z.array(line).nullable(),
        url: line.optional(),
        group: z.array(line).optional(),
        scripts: z.array(interopScriptSchema).optional(),
    })
    .strict() satisfies z.ZodType<InteropHttpOperation>;
