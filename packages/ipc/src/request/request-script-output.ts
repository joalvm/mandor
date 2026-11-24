import { scriptErrorSchema } from '@mandor/schema';
import { z } from 'zod';

import { SCRIPT_SAID_SHAPE } from '../script/script-said.js';

/**
 * Pushed to the window when the scripts of a send end: those before it left, whether they let it
 * go or not, and those that read its answer. Every text in it is already redacted in main.
 */
export const requestScriptOutputSchema = z
    .object({
        sendId: z.uuid(),
        phase: z.enum(['before', 'response']),
        ...SCRIPT_SAID_SHAPE,
        /** A script moved where the send went: it left with no secret. */
        destinationMoved: z.boolean(),
        /** Where a redirect stopped, because going on would have taken a secret along. */
        heldAt: z.string().optional(),
        error: scriptErrorSchema.optional(),
    })
    .strict();

export type RequestScriptOutput = z.infer<typeof requestScriptOutputSchema>;
