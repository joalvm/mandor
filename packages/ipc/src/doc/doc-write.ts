import { docNameSchema, slugSchema } from '@mandor/schema';
import { z } from 'zod';

/**
 * The whole text of the doc, never a patch. The editor holds the document while it is open, so
 * what it sends is the document, and main writes it without having to reconstruct anything.
 */
export const docWriteRequestSchema = z.object({
    workspaceId: slugSchema,
    name: docNameSchema,
    text: z.string(),
});

export type DocWriteRequest = z.infer<typeof docWriteRequestSchema>;
