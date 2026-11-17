import { bridge, fireAndForget, shellStore, useShellStore } from '@mandor/shell';
import { useEffect } from 'react';

/**
 * Keeps the list of clashes the open origin holds for a person: the answer of main when the
 * origin opens, and again every time main says the list changed. Only the newest question is
 * heard, so a slow answer never overwrites a faster one that was asked after it. Letting go of
 * the origin empties the list in the store, and nothing is asked while none is open.
 */
export function useConflictFeed(): void {
    const originId = useShellStore((state) => state.activeOriginId);

    useEffect(() => {
        if (originId === null) {
            return undefined;
        }

        let alive = true;
        let asked = 0;
        const refresh = (): void => {
            const turn = ++asked;

            fireAndForget(
                bridge.conflict.list().then((answer) => {
                    if (alive && turn === asked && answer.ok) {
                        shellStore.getState().setConflicts(answer.value);
                    }
                }),
            );
        };

        const stop = bridge.conflict.onChanged(refresh);

        refresh();

        return () => {
            alive = false;
            stop();
        };
    }, [originId]);
}
