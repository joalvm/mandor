import type { ReactNode } from 'react';

import { useDeclaredPart } from '../../declare/useDeclaredPart.js';
import { TabKindIdContext } from '../../tab/tab-context.js';
import { tabKindDeclarations, type TabPart } from '../../tab/tab-kind-registry.js';

/** Hands what a part holds to the kind it sits in, before a restored tab first draws. */
export function useTabPart(part: TabPart, children: ReactNode): void {
    useDeclaredPart(
        {
            declarations: tabKindDeclarations,
            misplaced: `A tab ${part} is declared inside a TabKind.`,
            owner: TabKindIdContext,
            part,
        },
        children,
    );
}
