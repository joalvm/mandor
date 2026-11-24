import { z } from 'zod';

// What of the JSON the `.bru` parser gives the import reads. The parser has no types, so these
// schemas are the contract with it: every key is optional, and what no one reads is dropped.

const text = z.string().nullish();
const flag = z.boolean().nullish();

/** A row of a table: a header, a parameter, a field of a form. A file field holds a list. */
const rowSchema = z.object({
    name: text,
    value: z.union([z.string(), z.array(z.string())]).nullish(),
    enabled: flag,
    type: text,
});

export type BruRow = z.output<typeof rowSchema>;

/** The blocks of auth, by the name of the scheme: `{ bearer: { token } }`. */
const authBlocksSchema = z.record(z.string(), z.unknown()).nullish();

const metaSchema = z.object({
    name: text,
    type: text,
    seq: z.union([z.string(), z.number()]).nullish(),
    tags: z.array(z.string()).nullish(),
});

/** The blocks of a body, by what they hold; `http.body` or `mode` says which goes. */
export const bruBodySchema = z.object({
    json: text,
    text,
    xml: text,
    sparql: text,
    graphql: z.object({ query: text, variables: text }).nullish(),
    formUrlEncoded: z.array(rowSchema).nullish(),
    multipartForm: z.array(rowSchema).nullish(),
    file: z.array(z.object({ filePath: text, selected: flag })).nullish(),
    ws: z.array(z.object({ name: text, type: text, content: text, selected: flag })).nullish(),
});

/** The `script:pre-request` and `script:post-response` blocks, by the parser's names. */
const bruScriptSchema = z.object({ req: text, res: text }).nullish();

export type BruScript = z.output<typeof bruScriptSchema>;

/** The rows of a table, which may not be there. */
export const bruRowsSchema = z.array(rowSchema).nullish();

export const bruRequestSchema = z.object({
    meta: metaSchema.nullish(),
    http: z.object({ method: text, url: text, body: text, auth: text }).nullish(),
    ws: z.object({ url: text, body: text, auth: text }).nullish(),
    params: z.array(rowSchema).nullish(),
    headers: z.array(rowSchema).nullish(),
    auth: authBlocksSchema,
    body: bruBodySchema.nullish(),
    vars: z.unknown().optional(),
    script: bruScriptSchema,
    tests: text,
    assertions: z.unknown().optional(),
    settings: z.unknown().optional(),
    examples: z.unknown().optional(),
    docs: text,
});

export type BruRequest = z.output<typeof bruRequestSchema>;

/** The `folder.bru` and the `collection.bru`: auth names its scheme in `mode`. */
export const bruCollectionSchema = z.object({
    meta: metaSchema.nullish(),
    headers: z.array(rowSchema).nullish(),
    auth: z.object({ mode: text }).catchall(z.unknown()).nullish(),
    vars: z.object({ req: z.array(rowSchema).nullish() }).nullish(),
    script: bruScriptSchema,
    tests: text,
    docs: text,
});

export const bruEnvironmentSchema = z.object({
    variables: z
        .array(z.object({ name: z.string(), value: z.string(), enabled: flag, secret: flag }))
        .default([]),
});
