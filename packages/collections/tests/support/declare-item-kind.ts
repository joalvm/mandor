import { itemKindDeclarations, type ItemLeaf } from '../../src/item-leaf-registry.js';

/**
 * Declares a whole kind of item at once, for a test that asks the collection about a kind without
 * drawing the tree an app writes. Production declares through `ItemKind`, never through this.
 */
export function declareItemKind({
    body,
    exampleMark,
    mark,
    status,
    ...logic
}: ItemLeaf): () => void {
    const stops = [
        itemKindDeclarations.declare(logic),
        itemKindDeclarations.declarePart(logic.id, 'body', body),
        itemKindDeclarations.declarePart(logic.id, 'exampleMark', exampleMark),
        itemKindDeclarations.declarePart(logic.id, 'mark', mark),
        itemKindDeclarations.declarePart(logic.id, 'status', status),
    ];

    return () => {
        for (const stop of stops.toReversed()) {
            stop();
        }
    };
}
