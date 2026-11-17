import { z } from 'zod';

import { resultSchema } from '../result/result-schema.js';
import { uiSessionSchema } from './ui-session.js';

// Main reads the session of the active origin, so the request carries nothing at all.
export const sessionLoadRequestSchema = z.object({}).strict();
export const sessionLoadResultSchema = resultSchema(uiSessionSchema);
