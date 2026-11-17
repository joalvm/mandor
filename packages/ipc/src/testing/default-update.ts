import type { UpdateArea } from '../bridge/update-area.js';
import { success } from '../result/success.js';
import type { UpdateState } from '../update/update-state.js';

export type UpdateChangedHandler = (state: UpdateState) => void;

const NOTHING: UpdateState = { phase: 'idle', support: 'unsupported', current: '0.0.0' };

/** The update area a test gets when it says nothing about updates: an install with none to offer. */
export function defaultUpdate(handlers: Set<UpdateChangedHandler>): UpdateArea {
    return {
        state: () => Promise.resolve(success(NOTHING)),
        configure: () => Promise.resolve(success({})),
        check: () => Promise.resolve(success({})),
        download: () => Promise.resolve(success({})),
        install: () => Promise.resolve(success({})),
        openPage: () => Promise.resolve(success({})),
        onChanged: (handler) => {
            handlers.add(handler);

            return () => handlers.delete(handler);
        },
    };
}
