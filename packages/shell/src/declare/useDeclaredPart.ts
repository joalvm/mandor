import { use, useLayoutEffect, type Context, type ReactNode } from 'react';

import type { Declarations } from './declarations.js';

/** Where a part sits: the id its owner gives, the registry it goes into, and its slot. */
type DeclaredPartSlot<Logic extends { id: string }, Part extends string> = {
    declarations: Declarations<Logic, Part>;
    /** Thrown when the part is written outside its owner, saying where it belongs. */
    misplaced: string;
    owner: Context<string | null>;
    part: Part;
};

/**
 * Hands what a part holds to the declaration it sits in. A layout effect, so what a restored
 * session draws on its first paint already finds its parts: the session loads in a passive
 * effect, after every layout effect of the tree.
 */
export function useDeclaredPart<Logic extends { id: string }, Part extends string>(
    { declarations, misplaced, owner, part }: DeclaredPartSlot<Logic, Part>,
    children: ReactNode,
): void {
    const id = use(owner);

    if (id === null) {
        throw new Error(misplaced);
    }

    useLayoutEffect(
        () => declarations.declarePart(id, part, children),
        [declarations, id, part, children],
    );
}
