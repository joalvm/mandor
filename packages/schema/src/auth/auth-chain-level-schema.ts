import { z } from 'zod';

import type { AuthChainLevel } from './auth-chain-level.js';
import { authConfigSchema } from './auth-config-schema.js';
import { authPlaceSchema } from './auth-place-schema.js';

/** One level of the chain as main hands it back: where it sits, its name, what it decides. */
export const authChainLevelSchema = z
    .object({ place: authPlaceSchema, name: z.string(), auth: authConfigSchema.optional() })
    .strict() satisfies z.ZodType<AuthChainLevel>;
