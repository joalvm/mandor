import { bridge, fireAndForget } from '@mandor/shell';

import { updateStore } from './update-store.js';

/**
 * Keeps the store as main says it: asks for the state once, then takes every push as the whole of
 * the new one. A push that lands before the answer wins, because the answer is older than it.
 */
export function startUpdateSync(): () => void {
    let live = true;
    const stopListening = bridge.update.onChanged((state) => {
        updateStore.getState().setState(state);
    });

    fireAndForget(
        bridge.update.state().then((result) => {
            if (live && result.ok && updateStore.getState().state === undefined) {
                updateStore.getState().setState(result.value);
            }
        }),
    );

    return () => {
        live = false;
        stopListening();
    };
}
