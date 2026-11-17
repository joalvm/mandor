import { z } from 'zod';

import { uiSessionSchema } from './ui-session.js';

// Main writes the session of the active origin, so the request carries the session and
// nothing else.
export const sessionSaveRequestSchema = z.object({ session: uiSessionSchema }).strict();

export type SessionSaveRequest = z.infer<typeof sessionSaveRequestSchema>;
