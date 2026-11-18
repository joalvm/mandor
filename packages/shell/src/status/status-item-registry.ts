import { useMemo } from 'react';

import { createDeclarations, type Declared } from '../declare/declarations.js';
import { useDeclaredList } from '../declare/useDeclared.js';

/** Where a piece of the status line sits: a bell, an update that is ready. */
export type StatusItemLogic = {
    id: string;
    /** Left to right, ascending. Ties keep the order of arrival. */
    order: number;
};

type StatusItemSpec = Declared<StatusItemLogic, 'content'>;

/**
 * The registry `StatusItem` writes into. The line knows no piece by name: whoever owns the state
 * declares how it is drawn, and the line only lays them out.
 */
export const statusItemDeclarations = createDeclarations<StatusItemLogic, 'content'>();

/** The pieces declared now, in order. */
export function useStatusItems(): readonly StatusItemSpec[] {
    const declared = useDeclaredList(statusItemDeclarations);

    return useMemo(
        () => declared.toSorted((first, second) => first.order - second.order),
        [declared],
    );
}
