import { docNameSchema, entityNameSchema, slugSchema } from '@mandor/schema';
import { z } from 'zod';

/**
 * The doc and the title it takes. The file keeps its name: the title lives in the file, so a
 * rename rewrites that one field and nothing moves.
 */
export const docRenameRequestSchema = z.object({
    workspaceId: slugSchema,
    name: docNameSchema,
    title: entityNameSchema,
});

export type DocRenameRequest = z.infer<typeof docRenameRequestSchema>;
