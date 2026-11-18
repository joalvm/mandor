import { z } from 'zod';

import { itemOriginSchema } from '../collection/item-origin-schema.js';
import { entityNameSchema } from '../fields/entity-name-schema.js';
import { slugSchema } from '../fields/slug-schema.js';
import type { Environment } from './environment.js';
import { variableSchema } from './variable-schema.js';

export const environmentSchema = z.object({
    id: slugSchema,
    name: entityNameSchema,
    variables: z.array(variableSchema),
    origin: itemOriginSchema.optional(),
}) satisfies z.ZodType<Environment>;
