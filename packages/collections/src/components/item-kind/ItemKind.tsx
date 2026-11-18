import { useLayoutEffect, type PropsWithChildren } from 'react';

import { ItemKindIdContext } from '../../item-context.js';
import { itemKindDeclarations, type ItemKindLogic } from '../../item-leaf-registry.js';

/** The children are `ItemBody`, `ItemMark` and `ItemStatus`: what every item of the kind shows. */
type ItemKindProps = PropsWithChildren<Omit<ItemKindLogic, 'id'> & { kind: string }>;

/**
 * Declares what the window does with one kind of item while it is mounted. The collection never
 * names a kind: each app writes the ones it draws, and an item of any other kind is a page
 * saying so.
 */
export function ItemKind({ children, kind, ...logic }: ItemKindProps) {
    useLayoutEffect(() => itemKindDeclarations.declare({ ...logic, id: kind }));

    return <ItemKindIdContext value={kind}>{children}</ItemKindIdContext>;
}
