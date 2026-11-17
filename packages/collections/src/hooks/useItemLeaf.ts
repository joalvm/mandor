import { useDeclared } from '@mandor/shell';

import { itemKindDeclarations, type ItemLeaf } from '../item-leaf-registry.js';

/** The declared kind of item, read again whenever it moves; nothing for an undeclared one. */
export function useItemLeaf(kind: string | undefined): ItemLeaf | undefined {
    return useDeclared(itemKindDeclarations, kind);
}
