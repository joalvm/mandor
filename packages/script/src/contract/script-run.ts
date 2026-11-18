import { chainLogSchema, SCRIPT_EVENTS, scriptErrorSchema, scriptTestSchema } from '@mandor/schema';
import { z } from 'zod';

/** Where a script of the user hooks in: a request or a connection. */
export const scriptEventSchema = z.enum(SCRIPT_EVENTS);

/** A header or a query line, by name. */
const lineSchema = z.strictObject({ name: z.string(), value: z.string() });

/**
 * A variable as the script sees it. A secret comes as its name alone: a variable with a value
 * and `withheld` at once is no variable, so the value of a secret has no way in.
 */
const snapshotVariableSchema = z.union([
    z.strictObject({ name: z.string(), value: z.string() }),
    z.strictObject({ name: z.string(), withheld: z.literal(true) }),
]);

const snapshotRequestSchema = z.strictObject({
    url: z.string(),
    method: z.string(),
    headers: z.array(lineSchema),
    query: z.array(lineSchema),
    body: z.strictObject({ type: z.string(), text: z.string() }).optional(),
});

/** The answer. `text` is absent when the body is over the size a script may read, or is not text. */
const snapshotResponseSchema = z.strictObject({
    status: z.number().int(),
    headers: z.array(lineSchema),
    text: z.string().optional(),
    bodyBytes: z.number().int().nonnegative(),
    timeMs: z.number().nonnegative(),
});

const snapshotMessageSchema = z.strictObject({
    text: z.string().optional(),
    direction: z.enum(['incoming', 'outgoing']),
    binary: z.boolean(),
    event: z.string().optional(),
});

/** What a script sees of the world when it starts: a photo that no later change reaches. */
export const scriptSnapshotSchema = z.strictObject({
    variables: z.array(snapshotVariableSchema),
    request: snapshotRequestSchema.optional(),
    response: snapshotResponseSchema.optional(),
    message: snapshotMessageSchema.optional(),
    info: z.strictObject({ event: scriptEventSchema, name: z.string() }),
});

export type ScriptSnapshot = z.infer<typeof scriptSnapshotSchema>;

/** What main gives the worker to run. */
export const scriptRunInputSchema = z.strictObject({
    event: scriptEventSchema,
    source: z.string(),
    snapshot: scriptSnapshotSchema,
});

export type ScriptRunInput = z.infer<typeof scriptRunInputSchema>;

/** The kinds of body a script may write. */
const writableBodySchema = z.enum(['json', 'text', 'xml']);

/**
 * What a script asks main to change. Nothing here is done by the script: main reads each one,
 * checks the event allows it, and decides. Every effect that carries text carries it as `value`.
 */
export const scriptEffectSchema = z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('var'), name: z.string(), value: z.string() }),
    z.strictObject({
        kind: z.literal('header'),
        name: z.string(),
        op: z.enum(['set', 'delete']),
        value: z.string().optional(),
    }),
    z.strictObject({
        kind: z.literal('query'),
        name: z.string(),
        op: z.enum(['set', 'delete']),
        value: z.string().optional(),
    }),
    z.strictObject({ kind: z.literal('url'), value: z.string() }),
    z.strictObject({ kind: z.literal('method'), value: z.string() }),
    z.strictObject({ kind: z.literal('body'), type: writableBodySchema, value: z.string() }),
    z.strictObject({ kind: z.literal('socket'), value: z.string() }),
]);

export type ScriptEffect = z.infer<typeof scriptEffectSchema>;

/** What the worker gives back: the asks, the console, the cases and the error that ended it. */
export const scriptRunOutputSchema = z.strictObject({
    effects: z.array(scriptEffectSchema),
    logs: z.array(chainLogSchema),
    tests: z.array(scriptTestSchema),
    error: scriptErrorSchema.optional(),
});

export type ScriptRunOutput = z.infer<typeof scriptRunOutputSchema>;
