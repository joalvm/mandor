import { z } from 'zod';

// The shape the reader needs, over what Insomnia wrote, and nothing else: every object is loose,
// so a key nobody reads rides along unharmed. Insomnia writes `null` where it means nothing, so
// every leaf is nullish.

const maybeText = z.string().nullish();

/** A header, a parameter or a field of a form. A path parameter is the same row. */
const rowSchema = z
    .object({
        name: maybeText,
        value: maybeText,
        disabled: z.boolean().nullish(),
        type: maybeText,
        fileName: maybeText,
    })
    .loose();

const bodySchema = z
    .object({
        mimeType: maybeText,
        text: maybeText,
        fileName: maybeText,
        params: z.array(rowSchema).nullish(),
    })
    .loose();

export const environmentDataSchema = z.record(z.string(), z.unknown());

/** The scripts of a request or a folder, as version 5 nests them. */
const scriptsSchema = z.object({ preRequest: maybeText, afterResponse: maybeText }).loose();

const maybeSwitch = z.boolean().nullish();

/** The switches of a request, as version 5 nests them. */
const settingsSchema = z
    .object({
        followRedirects: maybeText,
        encodeUrl: maybeSwitch,
        rebuildPath: maybeSwitch,
        renderRequestBody: maybeSwitch,
        cookies: z.object({ send: maybeSwitch, store: maybeSwitch }).loose().nullish(),
    })
    .loose();

/** What both layouts say of a request or of a folder; only a folder reads `environment`. */
export const nodePartsShape = {
    name: maybeText,
    method: maybeText,
    url: maybeText,
    body: bodySchema.nullish(),
    headers: z.array(rowSchema).nullish(),
    parameters: z.array(rowSchema).nullish(),
    pathParameters: z.array(rowSchema).nullish(),
    authentication: z.record(z.string(), z.unknown()).nullish(),
    environment: environmentDataSchema.nullish(),
    scripts: scriptsSchema.nullish(),
    settings: settingsSchema.nullish(),
};

/** A resource of the flat list: what ties it to its parent, and what it says of itself. */
const resourceSchema = z
    .object({
        _id: z.string(),
        _type: z.string(),
        parentId: maybeText,
        description: maybeText,
        metaSortKey: z.number().nullish(),
        data: environmentDataSchema.nullish(),
        preRequestScript: maybeText,
        afterResponseScript: maybeText,
        settingFollowRedirects: maybeText,
        settingEncodeUrl: maybeSwitch,
        settingRebuildPath: maybeSwitch,
        settingRenderRequestBody: maybeSwitch,
        settingSendCookies: maybeSwitch,
        settingStoreCookies: maybeSwitch,
        ...nodePartsShape,
    })
    .loose();

export const insomniaV4Schema = z
    .object({
        _type: z.literal('export'),
        __export_format: z.literal(4),
        resources: z.array(resourceSchema),
    })
    .loose();

export type InsomniaV4Resource = z.infer<typeof resourceSchema>;
export type InsomniaNodeParts = z.infer<z.ZodObject<typeof nodePartsShape>>;
