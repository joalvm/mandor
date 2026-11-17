import { useLayoutEffect, type ReactNode } from 'react';

import type { Declarations } from './declarations.js';

/**
 * Declares what a component decides and the one thing it shows, for a declaration with a single
 * part: a piece of the status line, the page of an empty group, an action beside the tabs.
 * Logic every draw, so a prop that changes is heard; the part while its element stays the same.
 */
export function useDeclaration<Logic extends { id: string }, Part extends string>(
    declarations: Declarations<Logic, Part>,
    logic: Logic,
    part: Part,
    node: ReactNode,
): void {
    useLayoutEffect(() => declarations.declare(logic));

    useLayoutEffect(
        () => declarations.declarePart(logic.id, part, node),
        [declarations, logic.id, part, node],
    );
}
