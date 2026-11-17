import { collectionPathSchema, entityNameSchema, slugSchema } from '@mandor/schema';
import { z } from 'zod';

/**
 * One frame on its way out, as a template. The renderer never resolves: it says where the
 * frame belongs and main reads the values, so a secret is only ever a string in main. The
 * environment is the one the socket opened with, which main holds: the window names none.
 *
 * `origin` is the collection item the frame came from, so the timeline can name it. A frame
 * written by hand in the composer comes from nothing and says so.
 */
export const wsSendRequestSchema = z
    .object({
        connectionId: slugSchema,
        workspaceId: slugSchema,
        template: z.string(),
        /**
         * The schema the payload promises to meet, when it carries one. Main is who
         * checks it, over the frame it resolved: the mark of the timeline is its answer.
         */
        schema: z.string().max(65_536).optional(),
        /**
         * The envelope the connection wraps the frame in, with `{{event}}` and `{{payload}}`
         * as the holes. Absent, the frame leaves as the template says it: an envelope is a
         * decision of the connection, and main is who fills it.
         */
        frame: z.string().max(65_536).optional(),
        origin: entityNameSchema.nullable(),
        /**
         * The collection item the frame was loaded from, whose folders resolve its variables;
         * null for free text. Main reads the chain itself and never trusts values from here.
         */
        itemPath: collectionPathSchema.nullable(),
        event: z.string().min(1).max(256).optional(),
        expectAck: z
            .object({ timeoutMs: z.number().int().positive().max(3_600_000) })
            .strict()
            .optional(),
    })
    .strict();

export type WsSendRequest = z.infer<typeof wsSendRequestSchema>;
