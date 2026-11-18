import { z } from 'zod';

// What of OpenCollection the import reads. Every key is optional and may be empty, and what no
// one reads is dropped: a collection written by hand or by an older Bruno still opens. A test of
// types keeps each shape honest against the types that OpenCollection publishes.

const text = z.string().nullish();
const flag = z.boolean().nullish();

/** A description or a document: plain text, or text that says its own type. */
export const descriptionSchema = z
    .union([z.string(), z.object({ content: text, type: text })])
    .nullish();

const headerSchema = z.object({ name: text, value: text, disabled: flag });
const paramSchema = headerSchema.extend({ type: text });

/** A field of a form: a text, or a file when `type` says so (and then the value is its path). */
export const formEntrySchema = z.object({
    name: text,
    value: z.union([z.string(), z.array(z.string())]).nullish(),
    type: text,
    disabled: flag,
});

/** One file a `file` body can send; the one marked `selected` is the one that goes. */
export const fileVariantSchema = z.object({ filePath: text, selected: flag });

const bodySchema = z.object({
    type: text,
    data: z.union([z.string(), z.array(z.unknown())]).nullish(),
});

const graphqlBodySchema = z.object({ query: text, variables: text });

/** A body, or the list of bodies a request offers, one of them marked `selected`. */
const bodiesSchema = z
    .union([bodySchema, z.array(z.object({ selected: flag, body: bodySchema.nullish() }))])
    .nullish();

const graphqlBodiesSchema = z
    .union([
        graphqlBodySchema,
        z.array(z.object({ selected: flag, body: graphqlBodySchema.nullish() })),
    ])
    .nullish();

/** `inherit`, or a scheme with the fields of every one: the `type` says which are meant. */
export const authSchema = z
    .union([
        z.literal('inherit'),
        z.object({
            type: z.string(),
            username: text,
            password: text,
            token: text,
            key: text,
            value: text,
            placement: text,
            flow: text,
            accessTokenUrl: text,
            authorizationUrl: text,
            callbackUrl: text,
            scope: text,
            credentials: z
                .object({ clientId: text, clientSecret: text, placement: text })
                .nullish(),
            pkce: z.object({ disabled: flag }).nullish(),
        }),
    ])
    .nullish();

/** A variable; its value is a text, a typed value or a list of variants, so it stays loose. */
export const variableSchema = z.object({
    name: text,
    value: z.unknown().optional(),
    disabled: flag,
    secret: flag,
});

const detailsShape = {
    method: text,
    url: text,
    headers: z.array(headerSchema).nullish(),
    params: z.array(paramSchema).nullish(),
    auth: authSchema,
};

export const httpSchema = z.object({ ...detailsShape, body: bodiesSchema });

export const graphqlSchema = z.object({ ...detailsShape, body: graphqlBodiesSchema });

const messageSchema = z.object({ type: text, data: text });

/** A saved message, or the variants of one, each titled and one of them marked `selected`. */
const messagesSchema = z
    .union([
        messageSchema,
        z.array(z.object({ title: text, selected: flag, message: messageSchema.nullish() })),
    ])
    .nullish();

export const websocketSchema = z.object({
    url: text,
    headers: z.array(headerSchema).nullish(),
    message: messagesSchema,
    auth: authSchema,
});

/** What a collection and a folder say for the requests under them. */
const requestDefaultsSchema = z.object({
    headers: z.array(headerSchema).nullish(),
    auth: authSchema,
    variables: z.array(variableSchema).nullish(),
    scripts: z.unknown().optional(),
    actions: z.unknown().optional(),
});

const infoSchema = z.object({
    name: text,
    description: descriptionSchema,
    summary: text,
    type: text,
    seq: z.number().nullish(),
    tags: z.array(z.string()).nullish(),
});

/** An item of the collection before it is told apart: a request, a folder or something else. */
export const itemSchema = z.object({
    info: infoSchema.nullish(),
    http: httpSchema.nullish(),
    graphql: graphqlSchema.nullish(),
    websocket: websocketSchema.nullish(),
    items: z.array(z.unknown()).nullish(),
    request: requestDefaultsSchema.nullish(),
    runtime: z
        .object({
            variables: z.array(variableSchema).nullish(),
            scripts: z.unknown().optional(),
            assertions: z.unknown().optional(),
            actions: z.unknown().optional(),
        })
        .nullish(),
    settings: z.unknown().optional(),
    examples: z.unknown().optional(),
    docs: descriptionSchema,
    type: text,
    script: text,
    code: text,
});

export const environmentSchema = z.object({
    name: text,
    variables: z.array(variableSchema).nullish(),
});

export const collectionSchema = z.object({
    opencollection: text,
    info: infoSchema.nullish(),
    config: z.object({ environments: z.array(environmentSchema).nullish() }).nullish(),
    request: requestDefaultsSchema.nullish(),
    items: z.array(z.unknown()).nullish(),
    docs: descriptionSchema,
});
