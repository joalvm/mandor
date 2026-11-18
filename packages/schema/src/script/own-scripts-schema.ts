import { z } from 'zod';

import type { ConnectionScripts, RequestScripts, ScriptEntry } from './own-scripts.js';

const scriptEntrySchema = z.object({
    source: z.string(),
    enabled: z.boolean().optional(),
}) satisfies z.ZodType<ScriptEntry>;

// A loose object on purpose: a key of an event this version does not know is kept when the file is
// saved and never runs, so a file of a later version does not break nor lose a script here.
export const requestScriptsSchema = z.looseObject({
    onBeforeRequest: scriptEntrySchema.optional(),
    onResponse: scriptEntrySchema.optional(),
}) satisfies z.ZodType<RequestScripts>;

export const connectionScriptsSchema = z.looseObject({
    onBeforeConnect: scriptEntrySchema.optional(),
    onConnect: scriptEntrySchema.optional(),
    onMessage: scriptEntrySchema.optional(),
}) satisfies z.ZodType<ConnectionScripts>;
