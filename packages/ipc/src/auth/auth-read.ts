import { authConfigSchema, slugSchema } from '@mandor/schema';
import { z } from 'zod';

import { resultSchema } from '../result/result-schema.js';
/** The auth the workspace carries right now: null says the file has no `auth` key at all. */
export const authReadRequestSchema = z.object({ workspaceId: slugSchema }).strict();

export const placeAuthSchema = z.object({
    auth: authConfigSchema.nullable(),
});

export type AuthReadRequest = z.infer<typeof authReadRequestSchema>;
export type PlaceAuth = z.infer<typeof placeAuthSchema>;

export const authReadResultSchema = resultSchema(placeAuthSchema);
