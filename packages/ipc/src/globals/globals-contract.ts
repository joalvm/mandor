import { globalsSchema } from '@mandor/schema';
import { z } from 'zod';

import { resultSchema } from '../result/result-schema.js';

/**
 * The globals of the active origin. The window asks without naming a place: main knows the
 * origin, and the directory behind it never crosses the bridge. What comes back carries every
 * secret with an empty value — the value lives in the keychain of this machine.
 */
export const globalsReadRequestSchema = z.object({}).strict();

export const globalsReadResultSchema = resultSchema(globalsSchema);

/** The whole list, as the dialog leaves it. A secret value goes to the keychain, never to disk. */
export const globalsWriteRequestSchema = z.object({ globals: globalsSchema }).strict();

export const globalsWriteResultSchema = resultSchema(globalsSchema);

export type GlobalsReadRequest = z.infer<typeof globalsReadRequestSchema>;
export type GlobalsWriteRequest = z.infer<typeof globalsWriteRequestSchema>;
