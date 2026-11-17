import type { ItemOrigin } from './item-origin.js';

/**
 * The envelope of `collections.yaml`: the order of the top level, and where the collection came from
 * when a whole one was imported. The root needs its own file for the same reason a folder does
 * — the order has to live beside what it orders, or reordering touches everything.
 */
export type CollectionsFile = {
    order: string[];
    origin?: ItemOrigin | undefined;
};
