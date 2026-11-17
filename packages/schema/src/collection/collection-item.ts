import type { ItemOrigin } from './item-origin.js';

/**
 * One piece of reusable work, as the collection knows it. The envelope is everything the tree
 * needs to draw a row; `body` is the rest of the file, kept exactly as it was.
 *
 * The collection never looks inside the body. That is what lets one tree serve both apps without
 * a single test on which app is running: a message and a request differ only in there.
 */
export type CollectionItem = {
    /** What the item is. An app registers a renderer per kind; an unknown kind still lists. */
    kind: string;
    name: string;
    tags: string[];
    /** Absent means a person wrote it. Present names the import that did, so a re-import updates. */
    origin?: ItemOrigin | undefined;
    body: Record<string, unknown>;
};

/** The keys of an item the collection understands. Everything else in the file is body. */
export type CollectionItemEnvelope = Omit<CollectionItem, 'body'>;
