import { originSchema } from '@mandor/schema';
import { z } from 'zod';

import { resultSchema } from '../result/result-schema.js';

/**
 * The channel takes no request: the list of origins lives in userData, in main. What crosses
 * is the domain Origin alone, which carries no path on this machine.
 */
export const originListSchema = z.array(originSchema);

export const originListResultSchema = resultSchema(originListSchema);
