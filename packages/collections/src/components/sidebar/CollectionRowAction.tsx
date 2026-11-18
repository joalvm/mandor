import { useDeclaration } from '@mandor/shell';
import type { PropsWithChildren } from 'react';

import {
    collectionRowActionDeclarations,
    type CollectionRowKind,
} from '../../collection-actions.js';

type CollectionRowActionProps = PropsWithChildren<{
    id: string;
    /** The rows whose menu has the line: a collection, a folder, an item or an example. */
    kind: CollectionRowKind;
}>;

/**
 * Declares a line of the menu of the rows of one kind while it is mounted. The line reads the
 * row it was drawn for with `useCollectionRow`.
 */
export function CollectionRowAction({ children, id, kind }: CollectionRowActionProps) {
    useDeclaration(collectionRowActionDeclarations, { id, kind }, 'content', children);

    return null;
}
