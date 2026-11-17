import { slugSchema } from '@mandor/schema';
import { z } from 'zod';

import { openedOriginSchema } from './opened-origin.js';
import { resultSchema } from '../result/result-schema.js';

/** An origin is chosen by its id alone: main knows where each one lives, the renderer does not. */
export const originSwitchRequestSchema = z.object({ id: slugSchema }).strict();

export type OriginSwitchRequest = z.infer<typeof originSwitchRequestSchema>;

export const originSwitchResultSchema = resultSchema(openedOriginSchema);
