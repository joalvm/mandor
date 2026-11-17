import { z } from 'zod';

const harHeaderSchema = z.object({ name: z.string(), value: z.string() }).loose();

const harParamSchema = z
    .object({
        name: z.string(),
        value: z.string().optional(),
        fileName: z.string().optional(),
        contentType: z.string().optional(),
    })
    .loose();

const harPostDataSchema = z
    .object({
        mimeType: z.string().default(''),
        text: z.string().optional(),
        params: z.array(harParamSchema).optional(),
    })
    .loose();

const harContentSchema = z
    .object({
        mimeType: z.string().default(''),
        text: z.string().optional(),
        encoding: z.string().optional(),
    })
    .loose();

const harEntrySchema = z
    .object({
        request: z
            .object({
                method: z.string().min(1),
                url: z.string().min(1),
                headers: z.array(harHeaderSchema).default([]),
                postData: harPostDataSchema.optional(),
            })
            .loose(),
        response: z
            .object({
                status: z.number().int(),
                statusText: z.string().default(''),
                headers: z.array(harHeaderSchema).default([]),
                content: harContentSchema.optional(),
            })
            .loose()
            .optional(),
    })
    .loose();

/** What the importer reads of a HAR 1.2. Whatever else a browser adds (`_initiator`…) rides along, unread. */
export const harDocumentSchema = z
    .object({
        log: z
            .object({
                version: z.string().optional(),
                pages: z.array(z.object({ title: z.string().optional() }).loose()).optional(),
                entries: z.array(harEntrySchema),
            })
            .loose(),
    })
    .loose();

export type HarDocument = z.infer<typeof harDocumentSchema>;
export type HarEntry = HarDocument['log']['entries'][number];
export type HarPostData = z.infer<typeof harPostDataSchema>;
export type HarContent = z.infer<typeof harContentSchema>;
