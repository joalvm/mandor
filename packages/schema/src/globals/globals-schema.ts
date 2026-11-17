import { z } from 'zod';

import { variableSchema } from '../environment/variable-schema.js';

/**
 * `globals.yaml` at the root of an origin: an environment that is always active and that every
 * workspace of the origin shares. It travels with the origin, so a secret keeps its name and its
 * mark in the file and its value in the keychain of each machine, as in an environment.
 */
export const globalsSchema = z.object({
    variables: z.array(variableSchema).default([]),
});

export type Globals = z.infer<typeof globalsSchema>;

/** Reads `globals.yaml`. An empty file is an origin with no globals yet. */
export function parseGlobals(input: unknown): Globals {
    return globalsSchema.parse(input ?? {});
}
