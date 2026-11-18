import { parseWith } from '../format/parse-with.js';
import type { CollectionsFile } from './collections-file.js';
import { collectionsFileSchema } from './collections-file-schema.js';

/** Reads `collections.yaml`. A workspace whose collection nobody arranged parses to an empty order. */
export function parseCollectionsFile(input: unknown): CollectionsFile {
    const collection = parseWith(collectionsFileSchema, input);

    return { order: collection.order ?? [], origin: collection.origin };
}
