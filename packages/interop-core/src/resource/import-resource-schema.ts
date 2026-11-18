import { z } from 'zod';

import { itemOriginSchema } from '@mandor/schema';

import { degradationSchema } from './degradation.js';
import type { ImportResource } from './import-resource.js';
import { RESOURCE_PLACES } from './resource-place.js';

export const importResourceSchema = z
    .object({
        place: z.enum(RESOURCE_PLACES),
        itemKind: z.string().regex(/\S/).nullable(),
        route: z.string().regex(/\S/),
        name: z.string().regex(/\S/),
        fields: z.record(z.string(), z.unknown()),
        origin: itemOriginSchema,
        degradations: z.array(degradationSchema),
    })
    .strict()
    .refine(
        (resource) => (resource.place === 'item') === (resource.itemKind !== null),
        'an item names its kind and nothing else does',
    ) satisfies z.ZodType<ImportResource>;
