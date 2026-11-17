import type { z } from 'zod';

import { authTokenRequestSchema } from './auth-token-status.js';

/** Throws away the token the level holds, so the next send asks for another. */
export const authTokenForgetRequestSchema = authTokenRequestSchema;

export type AuthTokenForgetRequest = z.infer<typeof authTokenForgetRequestSchema>;
