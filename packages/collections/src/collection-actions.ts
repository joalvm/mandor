import type { CollectionNode } from '@mandor/schema';
import { createDeclarations } from '@mandor/shell';

/**
 * The buttons an app adds beside "New collection" in the header of the section. The section is
 * shared and knows no feature but its own, so what only the app can compose —the door of an
 * import— is declared from the app's tree and drawn here without a name.
 */
export const collectionsSectionActionDeclarations = createDeclarations<{ id: string }, 'content'>();

/** The rows with a menu of their own: the nodes of the tree, and the examples of an item. */
export type CollectionRowKind = CollectionNode['kind'] | 'example';

/**
 * The lines an app adds to the menu of the rows of one kind, which the menu draws without
 * knowing what they do. A line of the menu of a collection is not one of a folder.
 */
export const collectionRowActionDeclarations = createDeclarations<
    { id: string; kind: CollectionRowKind },
    'content'
>();
