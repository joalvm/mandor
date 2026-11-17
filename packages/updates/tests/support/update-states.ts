import type { UpdateState } from '@mandor/ipc';

import { updateStore } from '../../src/update-store.js';

const BASE: UpdateState = { phase: 'idle', support: 'full', current: '0.1.0' };

/** What main would say, with only what the test cares about written down. */
export function stateWith(patch: Partial<UpdateState>): UpdateState {
    return { ...BASE, ...patch };
}

/** Puts the store where main's last push would have left it. */
export function setUpdateState(patch: Partial<UpdateState>): void {
    updateStore.getState().setState(stateWith(patch));
}
