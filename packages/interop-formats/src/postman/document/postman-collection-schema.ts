import { z } from 'zod';

// The shape the mapper reads, over the file as written, and nothing else: every object is loose,
// so a key the mapper does not name rides along and lands in `extras`. The ways v2.1 lets a thing
// be written (a request as text, a url as text, headers as text, a description as text or object)
// are one shape here.

const description = z
    .union([
        z.string(),
        z.object({ content: z.string().nullish(), type: z.string().nullish() }).loose(),
    ])
    .nullish();

const postmanAuthSchema = z.object({ type: z.string() }).loose();

const postmanEventSchema = z
    .object({
        listen: z.string(),
        script: z
            .object({ exec: z.union([z.array(z.string()), z.string()]).nullish() })
            .loose()
            .nullish(),
        disabled: z.boolean().nullish(),
    })
    .loose();

const postmanVariableSchema = z
    .object({
        key: z.string(),
        value: z.unknown().optional(),
        type: z.string().nullish(),
        disabled: z.boolean().nullish(),
        description,
    })
    .loose();

const row = {
    key: z.string().nullish(),
    value: z.string().nullish(),
    disabled: z.boolean().nullish(),
    description,
};

const textList = z.union([z.array(z.string()), z.string()]).nullish();

const rowSchema = z.object(row).loose();

/** `Name: value` lines, split at the first colon. A line with no name is no header. */
const headerText = z.string().transform((text): z.infer<typeof rowSchema>[] =>
    text.split(/\r?\n/).flatMap((line) => {
        const at = line.indexOf(':');
        const key = line.slice(0, at).trim();

        return at <= 0 || key === '' ? [] : [{ key, value: line.slice(at + 1).trim() }];
    }),
);

const headers = z.union([z.array(rowSchema), headerText]).nullish();

const postmanUrlSchema = z
    .object({
        raw: z.string().nullish(),
        protocol: z.string().nullish(),
        host: textList,
        path: textList,
        port: z.union([z.string(), z.number()]).nullish(),
        query: z.array(rowSchema).nullish(),
        variable: z
            .array(z.object({ key: z.string(), value: z.string().nullish(), description }).loose())
            .nullish(),
        hash: z.string().nullish(),
    })
    .loose();

const postmanBodySchema = z
    .object({
        mode: z.string().nullish(),
        raw: z.string().nullish(),
        options: z
            .object({
                raw: z.object({ language: z.string().nullish() }).loose().nullish(),
            })
            .loose()
            .nullish(),
        urlencoded: z.array(rowSchema).nullish(),
        formdata: z
            .array(
                z
                    .object({
                        ...row,
                        type: z.string().nullish(),
                        src: textList,
                        contentType: z.string().nullish(),
                    })
                    .loose(),
            )
            .nullish(),
        file: z.object({ src: z.string().nullish() }).loose().nullish(),
        graphql: z
            .object({ query: z.string().nullish(), variables: z.unknown().optional() })
            .loose()
            .nullish(),
        disabled: z.boolean().nullish(),
    })
    .loose();

const postmanRequestSchema = z
    .object({
        method: z.string().nullish(),
        url: z.union([z.string().transform((raw) => ({ raw })), postmanUrlSchema]).nullish(),
        header: headers,
        body: postmanBodySchema.nullish(),
        auth: postmanAuthSchema.nullish(),
        description,
    })
    .loose();

/** A request as the file may write it: an object, or only its address as text. */
const postmanRequestOrTextSchema = z.union([
    z.string().transform((raw) => ({ url: { raw } })),
    postmanRequestSchema,
]);

const postmanCookieSchema = z
    .object({
        name: z.string().nullish(),
        value: z.string().nullish(),
        domain: z.string().nullish(),
        path: z.string().nullish(),
        expires: z.string().nullish(),
        httpOnly: z.boolean().nullish(),
        secure: z.boolean().nullish(),
    })
    .loose();

// What an example adds to its response must not cost the file: written in a shape nobody knows,
// it is as if it were not written.
const postmanResponseSchema = z
    .object({
        name: z.string().nullish(),
        code: z.number().nullish(),
        header: headers,
        cookie: z.array(postmanCookieSchema).nullish().catch(undefined),
        body: z.string().nullish(),
        _postman_previewlanguage: z.string().nullish(),
        originalRequest: postmanRequestOrTextSchema.nullish().catch(undefined),
    })
    .loose();

export const postmanItemSchema = z.looseObject({
    name: z.string().nullish(),
    description,
    event: z.array(postmanEventSchema).nullish(),
    variable: z.array(postmanVariableSchema).nullish(),
    auth: postmanAuthSchema.nullish(),
    get item() {
        return z.array(postmanItemSchema).optional();
    },
    request: postmanRequestOrTextSchema.optional(),
    response: z.array(postmanResponseSchema).nullish(),
});

export const postmanCollectionSchema = z
    .object({
        info: z
            .object({
                name: z.string(),
                _postman_id: z.string().nullish(),
                schema: z.string(),
                description,
            })
            .loose(),
        item: z.array(postmanItemSchema),
        auth: postmanAuthSchema.nullish(),
        event: z.array(postmanEventSchema).nullish(),
        variable: z.array(postmanVariableSchema).nullish(),
    })
    .loose();

export type PostmanAuth = z.infer<typeof postmanAuthSchema>;
export type PostmanEvent = z.infer<typeof postmanEventSchema>;
export type PostmanUrl = z.infer<typeof postmanUrlSchema>;
export type PostmanBody = z.infer<typeof postmanBodySchema>;
export type PostmanRequest = z.infer<typeof postmanRequestSchema>;
export type PostmanResponse = z.infer<typeof postmanResponseSchema>;
export type PostmanItem = z.infer<typeof postmanItemSchema>;
export type PostmanCollection = z.infer<typeof postmanCollectionSchema>;
