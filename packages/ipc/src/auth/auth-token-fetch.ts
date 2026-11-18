import type { z } from 'zod';

import { authTokenRequestSchema } from './auth-token-status.js';

/** Asks for a new token — which opens the browser when the level is a code flow. */
export const authTokenFetchRequestSchema = authTokenRequestSchema;

export type AuthTokenFetchRequest = z.infer<typeof authTokenFetchRequestSchema>;
