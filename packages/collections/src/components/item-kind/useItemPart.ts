import { useDeclaredPart } from '@mandor/shell';
import type { ReactNode } from 'react';

import { ItemKindIdContext } from '../../item-context.js';
import { itemKindDeclarations, type ItemPart } from '../../item-leaf-registry.js';

/** Hands what a part holds to the kind of item it sits in. */
export function useItemPart(part: ItemPart, children: ReactNode): void {
    useDeclaredPart(
        {
            declarations: itemKindDeclarations,
            misplaced: `An item ${part} is declared inside an ItemKind.`,
            owner: ItemKindIdContext,
            part,
        },
        children,
    );
}
