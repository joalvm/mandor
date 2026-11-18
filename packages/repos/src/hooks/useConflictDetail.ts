import type { ConflictDetail } from '@mandor/ipc';
import { bridge, fireAndForget } from '@mandor/shell';
import { useEffect, useState } from 'react';

/** What a tab knows of its clash: still reading it, holding it, or told there is none. */
export type ConflictRead =
    { state: 'gone' } | { detail: ConflictDetail; state: 'ready' } | { state: 'loading' };

const LOADING: ConflictRead = { state: 'loading' };

/** A read with the clash it answers for. */
type HeardRead = { id: string; read: ConflictRead };

/**
 * Reads the clash a tab was opened on, and again every time main says the clashes changed, so
 * a clash that was resolved from somewhere else turns into «nothing to resolve» instead of
 * going on asking for answers nobody will take. Only the newest question is heard, and the read
 * of another clash is never shown.
 */
export function useConflictDetail(id: string): ConflictRead {
    const [heard, setHeard] = useState<HeardRead | null>(null);

    useEffect(() => {
        let alive = true;
        let asked = 0;
        const refresh = (): void => {
            const turn = ++asked;

            fireAndForget(
                bridge.conflict.read({ id }).then((answer) => {
                    if (alive && turn === asked) {
                        setHeard({
                            id,
                            read: answer.ok
                                ? { detail: answer.value, state: 'ready' }
                                : { state: 'gone' },
                        });
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
    }, [id]);

    return heard?.id === id ? heard.read : LOADING;
}
