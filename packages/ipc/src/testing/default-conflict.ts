import type { ConflictArea } from '../bridge/conflict-area.js';
import type { ConflictChangedPush } from '../conflict/conflict-changed.js';
import { success } from '../result/success.js';

export type ConflictChangedHandler = (push: ConflictChangedPush) => void;

/**
 * The conflict area a test gets when it says nothing about clashes: the origin keeps none, a
 * clash that is asked for is an empty one, and the list can be told it changed.
 */
export function defaultConflict(handlers: Set<ConflictChangedHandler>): ConflictArea {
    return {
        list: () => Promise.resolve(success([])),
        read: ({ id }) =>
            Promise.resolve(success({ id, entity: { area: 'repo' }, name: id, conflicts: [] })),
        resolve: () => Promise.resolve(success({})),
        keepMine: () => Promise.resolve(success({})),
        onChanged: (handler) => {
            handlers.add(handler);

            return () => handlers.delete(handler);
        },
    };
}
