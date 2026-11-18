import { z } from 'zod';

import { degradationSchema } from '../resource/degradation.js';

import { MESSAGE_PAYLOAD_TYPES } from '@mandor/schema';

import {
    INTEROP_DIRECTIONS,
    type InteropChannel,
    type InteropDocument,
    type InteropMessage,
    type InteropOperation,
    type InteropPayloadSchema,
    type InteropSecurityScheme,
    type InteropServer,
    type InteropServerVariable,
} from './interop-document.js';
import { interopHttpOperationSchema } from './interop-http-schema.js';
import {
    interopEnvironmentSchema,
    interopGroupSchema,
    interopScriptSchema,
    interopVariableSchema,
} from './interop-tree-schema.js';

const line = z.string().regex(/\S/);
const extras = z.record(z.string(), z.unknown());

const interopSecuritySchemeSchema = z
    .object({
        type: line,
        extras,
    })
    .strict() satisfies z.ZodType<InteropSecurityScheme>;

const interopServerVariableSchema = z
    .object({
        default: z.string(),
        enum: z.array(z.string()).optional(),
        description: z.string().optional(),
    })
    .strict() satisfies z.ZodType<InteropServerVariable>;

const interopServerSchema = z
    .object({
        name: line,
        url: line,
        protocol: line,
        security: z.array(line),
        variables: z.record(z.string(), interopServerVariableSchema),
        extras,
    })
    .strict() satisfies z.ZodType<InteropServer>;

const interopChannelSchema = z
    .object({
        name: line,
        address: line,
        description: z.string().optional(),
        extras,
    })
    .strict() satisfies z.ZodType<InteropChannel>;

const interopMessageSchema = z
    .object({
        name: z.string().optional(),
        payload: z.string().optional(),
        payloadType: z.enum(MESSAGE_PAYLOAD_TYPES).optional(),
        payloadSchema: line.optional(),
        headers: z.record(z.string(), z.string()).optional(),
        examples: z.array(z.string()),
        extras,
    })
    .strict() satisfies z.ZodType<InteropMessage>;

const interopOperationSchema = z
    .object({
        name: line,
        channel: line,
        direction: z.enum(INTEROP_DIRECTIONS),
        message: interopMessageSchema.optional(),
        security: z.array(line),
        http: interopHttpOperationSchema.optional(),
        extras,
    })
    .strict() satisfies z.ZodType<InteropOperation>;

const interopPayloadSchemaEntrySchema = z
    .object({
        text: z.string(),
        extras,
    })
    .strict() satisfies z.ZodType<InteropPayloadSchema>;

const interopDocumentBody = z
    .object({
        name: line,
        description: z.string().optional(),
        sourceId: line,
        servers: z.array(interopServerSchema),
        security: z.record(z.string(), interopSecuritySchemeSchema),
        channels: z.array(interopChannelSchema),
        operations: z.array(interopOperationSchema),
        defaultSecurity: z.array(line),
        payloadSchemas: z.record(z.string(), interopPayloadSchemaEntrySchema),
        notes: z.array(degradationSchema),
        extras,
        variables: z.array(interopVariableSchema).optional(),
        environments: z.array(interopEnvironmentSchema).optional(),
        groups: z.array(interopGroupSchema).optional(),
        sequence: z.array(z.enum(['folder', 'item'])).optional(),
        scripts: z.array(interopScriptSchema).optional(),
    })
    .strict() satisfies z.ZodType<InteropDocument>;

/** Reads a document whole: names are unique, and every name a reference points at is declared. */
export const interopDocumentSchema = interopDocumentBody
    .refine(uniqueNames, 'two things of one kind share a name')
    .refine(channelsExist, 'an operation names a channel the document does not declare')
    .refine(schemesExist, 'a reference names a security scheme the document does not declare')
    .refine(
        groupsExist,
        'the groups repeat, come before their parent, or a request names one nobody declared',
    )
    .refine(payloadSchemasExist, 'a message names a payload schema the document does not declare');

function uniqueNames(document: InteropDocument): boolean {
    const named: { name: string }[][] = [document.servers, document.channels, document.operations];

    return named.every((each) => new Set(each.map((node) => node.name)).size === each.length);
}

function channelsExist(document: InteropDocument): boolean {
    return document.operations.every((operation) =>
        document.channels.some((channel) => channel.name === operation.channel),
    );
}

function schemesExist(document: InteropDocument): boolean {
    const asked = [
        ...[...document.servers, ...document.operations].flatMap((each) => each.security),
        ...document.operations.flatMap((operation) => operation.http?.security ?? []),
        ...document.defaultSecurity,
        ...(document.groups ?? []).flatMap((group) => group.security ?? []),
    ];

    return asked.every((name) => document.security[name] !== undefined);
}

function payloadSchemasExist(document: InteropDocument): boolean {
    const named = document.operations.flatMap((operation) =>
        operation.message?.payloadSchema === undefined ? [] : [operation.message.payloadSchema],
    );

    return named.every((name) => document.payloadSchemas[name] !== undefined);
}

/**
 * A name of Postman may carry a `/`, so a path is told apart by the JSON of its names and never
 * by joining them. Each group is unique, comes after its parent, and every request lands in one.
 */
function groupsExist(document: InteropDocument): boolean {
    const groups = document.groups ?? [];
    const seen = new Set<string>();

    for (const group of groups) {
        const key = JSON.stringify(group.path);
        const parent = JSON.stringify(group.path.slice(0, -1));

        if (seen.has(key) || (group.path.length > 1 && !seen.has(parent))) {
            return false;
        }

        seen.add(key);
    }

    return document.operations.every(
        (operation) =>
            operation.http?.group === undefined || seen.has(JSON.stringify(operation.http.group)),
    );
}
