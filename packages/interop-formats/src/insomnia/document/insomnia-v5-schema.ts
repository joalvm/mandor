import { z } from 'zod';

import { environmentDataSchema, nodePartsShape } from './insomnia-v4-schema.js';

// Version 5 keeps the pieces of version 4 (rows, bodies, auth) and changes how they hang
// together: a tree instead of a flat list, with the description under `meta`.

const metaSchema = z
    .object({
        id: z.string().nullish(),
        description: z.string().nullish(),
    })
    .loose();

/** An item of the tree before it is told apart: a folder has `children`, a request a `method`. */
export const insomniaV5NodeSchema = z
    .object({
        meta: metaSchema.nullish(),
        children: z.array(z.unknown()).nullish(),
        ...nodePartsShape,
    })
    .loose();

const environmentSchema = z
    .object({
        name: z.string().nullish(),
        data: environmentDataSchema.nullish(),
    })
    .loose();

export const insomniaV5Schema = z
    .object({
        type: z.literal('collection.insomnia.rest/5.0'),
        name: z.string().nullish(),
        meta: metaSchema.nullish(),
        collection: z.array(z.unknown()).nullish(),
        environments: environmentSchema
            .extend({ subEnvironments: z.array(environmentSchema).nullish() })
            .nullish(),
    })
    .loose();
