import { bridge, fireAndForget, shellStore, useShellStore } from '@mandor/shell';
import { useEffect } from 'react';

/**
 * Keeps the window's knowledge of the synchronization of the open origin: what main answers
 * when an origin opens, and every push after. A push that lands before the answer is the newer
 * word and wins. Letting go of the origin clears it in the store, so the next one starts from
 * nothing instead of from the state of the last.
 */
export function useOriginSyncState(): void {
    const originId = useShellStore((state) => state.activeOriginId);

    useEffect(() => {
        if (originId === null) {
            return undefined;
        }

        let heard = false;
        let alive = true;
        const stop = bridge.origin.onStateChanged((push) => {
            heard = true;
            shellStore.getState().setSyncState(push);
        });

        fireAndForget(
            bridge.origin.state().then((answer) => {
                if (alive && !heard && answer.ok) {
                    shellStore.getState().setSyncState(answer.value);
                }
            }),
        );

        return () => {
            alive = false;
            stop();
        };
    }, [originId]);
}
