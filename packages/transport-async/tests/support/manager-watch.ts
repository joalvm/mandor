import {
    ConnectionManager,
    type ConnectionManagerOptions,
} from '../../src/manager/connection-manager.js';
import type { ActivityRecord } from '../../src/index.js';
import type {
    ConnectionActivityPush,
    ConnectionStatePush,
} from '../../src/manager/connection-manager-events.js';

export type ManagerWatch = {
    manager: ConnectionManager;
    states: ConnectionStatePush[];
    batches: ConnectionActivityPush[];
    records: ActivityRecord[];
};

/** A manager wired to recording events, so tests await conditions instead of the clock. */
export function watchManager(options: ConnectionManagerOptions = {}): ManagerWatch {
    const states: ConnectionStatePush[] = [];
    const batches: ConnectionActivityPush[] = [];
    const records: ActivityRecord[] = [];
    const manager = new ConnectionManager(
        {
            onState: (push) => {
                states.push(push);
            },
            onActivity: (push) => {
                batches.push(push);
                records.push(...push.records);
            },
        },
        options,
    );

    return { manager, states, batches, records };
}
