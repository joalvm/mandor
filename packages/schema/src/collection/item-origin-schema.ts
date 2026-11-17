import { z } from 'zod';

import { ITEM_ORIGIN_KINDS, type ItemOrigin } from './item-origin.js';

export const itemOriginSchema = z.object({
    kind: z.enum(ITEM_ORIGIN_KINDS),
    // Not a slug: a source names a document, and a file name or a url is neither lowercase
    // nor free of dots. What it may not be is empty, or it identifies nothing.
    sourceId: z.string().regex(/\S/),
    fingerprint: z.string().regex(/\S/).optional(),
}) satisfies z.ZodType<ItemOrigin>;
