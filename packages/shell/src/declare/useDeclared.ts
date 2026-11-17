import { useCallback, useSyncExternalStore } from 'react';

import type { Declarations, Declared } from './declarations.js';

/**
 * One declaration, read again whenever it moves: a part that arrives after its owner is on
 * screen draws without anyone touching the owner. Nothing, while the id is not declared.
 */
export function useDeclared<Logic extends { id: string }, Part extends string>(
    declarations: Declarations<Logic, Part>,
    id: string | undefined,
): Declared<Logic, Part> | undefined {
    const read = useCallback(
        () => (id === undefined ? undefined : declarations.get(id)),
        [declarations, id],
    );

    return useSyncExternalStore(declarations.subscribe, read, read);
}

/** Every declaration of a registry, in the order each first arrived. */
export function useDeclaredList<Logic extends { id: string }, Part extends string>(
    declarations: Declarations<Logic, Part>,
): readonly Declared<Logic, Part>[] {
    return useSyncExternalStore(declarations.subscribe, declarations.list, declarations.list);
}
