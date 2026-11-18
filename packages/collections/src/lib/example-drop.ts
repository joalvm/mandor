import type { CollectionNode } from '@mandor/schema';

import { isGroup } from './group-nodes.js';

/** What dragging an example carries: which one it is, and the item it sits under. */
export type CarriedExample = {
    fromPath: string;
    itemKind: string;
    resource: string;
};

type Data = Record<string | symbol, unknown>;

/** The data a dragged example travels with, read back by `carriedExampleIn`. */
export function dataOfCarriedExample(carried: CarriedExample): Data {
    return {
        exampleFrom: carried.fromPath,
        exampleKind: carried.itemKind,
        example: carried.resource,
    };
}

/** The example a drag carries; a drag of nodes carries none. */
export function carriedExampleIn(data: Data): CarriedExample | null {
    const fromPath = data['exampleFrom'];
    const itemKind = data['exampleKind'];
    const resource = data['example'];

    if (typeof fromPath !== 'string' || typeof itemKind !== 'string') {
        return null;
    }

    return typeof resource === 'string' ? { fromPath, itemKind, resource } : null;
}

/** An example lands on another item of its kind: one with no examples could not hold it. */
export function takesExample(carried: CarriedExample | null, node: CollectionNode): boolean {
    return (
        carried !== null &&
        !isGroup(node) &&
        node.itemKind === carried.itemKind &&
        node.path !== carried.fromPath
    );
}
