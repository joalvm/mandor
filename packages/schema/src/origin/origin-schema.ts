import { z } from 'zod';

import { entityNameSchema } from '../fields/entity-name-schema.js';
import { slugSchema } from '../fields/slug-schema.js';
import { ORIGIN_KINDS, type Origin } from './origin.js';
import { isOriginUrl } from './origin-url.js';

export const originSchema = z.object({
    id: slugSchema,
    name: entityNameSchema,
    kind: z.enum(ORIGIN_KINDS),
    // Not `z.url()`: the scp form (`git@host:org/repo`) is not a URL and still names an origin.
    url: z.string().refine(isOriginUrl).optional(),
}) satisfies z.ZodType<Origin>;
