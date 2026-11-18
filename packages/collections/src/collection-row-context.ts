import type { CollectionItemExample, CollectionNode } from '@mandor/schema';
import { createContext } from 'react';

/**
 * The row a line of its menu belongs to: the node, and the workspace it was read from. On the
 * menu of an example the node is its item and `example` is the example.
 */
export type CollectionRowContextValue = {
    example?: CollectionItemExample | undefined;
    node: CollectionNode;
    workspaceId: string;
};

/** Given by the menu of a row to the lines an app declared into it. */
export const CollectionRowProvider = createContext<CollectionRowContextValue | null>(null);
