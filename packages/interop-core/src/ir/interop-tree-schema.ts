import { IMPORTED_SCRIPT_EVENTS, SCRIPT_DIALECTS } from '@mandor/schema';
import { z } from 'zod';

import type {
    InteropBodyField,
    InteropEnvironment,
    InteropGroup,
    InteropScript,
    InteropVariable,
} from './interop-document.js';

const line = z.string().regex(/\S/);
const extras = z.record(z.string(), z.unknown());

export const interopVariableSchema = z
    .object({
        name: z.string(),
        value: z.string(),
        enabled: z.boolean(),
        secret: z.boolean(),
    })
    .strict() satisfies z.ZodType<InteropVariable>;

export const interopEnvironmentSchema = z
    .object({
        name: line,
        variables: z.array(interopVariableSchema),
        extras,
    })
    .strict() satisfies z.ZodType<InteropEnvironment>;

export const interopScriptSchema = z
    .object({
        event: z.enum(IMPORTED_SCRIPT_EVENTS),
        dialect: z.enum(SCRIPT_DIALECTS),
        source: z.string(),
        enabled: z.boolean(),
    })
    .strict() satisfies z.ZodType<InteropScript>;

export const interopGroupSchema = z
    .object({
        path: z.array(line).min(1),
        description: z.string().optional(),
        variables: z.array(interopVariableSchema).optional(),
        security: z.array(line).nullable(),
        scripts: z.array(interopScriptSchema),
        extras,
    })
    .strict() satisfies z.ZodType<InteropGroup>;

export const interopBodyFieldSchema = z
    .object({
        key: z.string(),
        value: z.string(),
        enabled: z.boolean(),
        kind: z.enum(['text', 'file']),
        contentType: z.string().optional(),
    })
    .strict() satisfies z.ZodType<InteropBodyField>;
