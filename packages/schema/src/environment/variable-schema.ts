import { z } from 'zod';

import type { Variable } from './variable.js';
import { variableNameSchema } from './variable-name-schema.js';

export const variableSchema = z.object({
    name: variableNameSchema,
    value: z.string(),
    enabled: z.boolean(),
    secret: z.boolean(),
}) satisfies z.ZodType<Variable>;
