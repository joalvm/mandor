import type { InteropFile } from '@mandor/interop-core';
import type { z } from 'zod';

import { bruCollectionSchema } from './bru-schema.js';
import { parseValue } from './parse-value.js';
import { collectionBruOf } from './read-bru.js';

/** What a `folder.bru` or a `collection.bru` says for the requests under it. */
export type BruLevel = z.output<typeof bruCollectionSchema>;

/** What a folder or collection with no such file says: nothing, so its requests keep their own. */
const NO_LEVEL: BruLevel = bruCollectionSchema.parse({});

/** The level a file describes; a folder or collection with no such file asks nothing. */
export function levelOfBru(file: InteropFile | undefined): BruLevel {
    return file === undefined
        ? NO_LEVEL
        : parseValue(collectionBruOf(file), file.path, bruCollectionSchema);
}
