/**
 * The importers that can write an item. There is no `manual` kind: an item nobody imported has
 * no origin at all, and an empty envelope is what says a person wrote it.
 */
export const ITEM_ORIGIN_KINDS = [
    'mandor',
    'asyncapi',
    'bruno',
    'har',
    'insomnia',
    'openapi',
    'postman',
] as const;

export type ItemOriginKind = (typeof ITEM_ORIGIN_KINDS)[number];

/**
 * Where an item came from. `sourceId` is what makes re-importing idempotent: the same source
 * updates the item it wrote last time instead of leaving a second copy beside it.
 */
export type ItemOrigin = {
    kind: ItemOriginKind;
    sourceId: string;
    /**
     * The fingerprint of what the import wrote when it wrote this item, so the next import can
     * tell "still exactly what I wrote" from "a person edited it since". Absent on origins
     * written before fingerprints existed, and on origins that name the source alone.
     */
    fingerprint?: string | undefined;
};
