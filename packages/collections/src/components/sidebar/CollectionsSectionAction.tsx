import { useDeclaration } from '@mandor/shell';
import type { PropsWithChildren } from 'react';

import { collectionsSectionActionDeclarations } from '../../collection-actions.js';

type CollectionsSectionActionProps = PropsWithChildren<{ id: string }>;

/** Declares a button beside "New collection" in the header of the section while it is mounted. */
export function CollectionsSectionAction({ children, id }: CollectionsSectionActionProps) {
    useDeclaration(collectionsSectionActionDeclarations, { id }, 'content', children);

    return null;
}
