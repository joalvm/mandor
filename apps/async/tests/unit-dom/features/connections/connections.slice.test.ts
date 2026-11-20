import { describe, expect, it } from 'vitest';

import {
    initialConnectionsSlice,
    RESTING_RECORDING,
} from '../../../../src/renderer/features/connections/connections.slice.js';

describe('the starting point of the connections slice', () => {
    it('holds nothing: no connection, no live state, no fault', () => {
        expect(initialConnectionsSlice()).toEqual({
            activeConnectionId: null,
            attempts: {},
            connections: [],
            faults: {},
            openedAt: {},
            recordings: {},
            renaming: null,
            states: {},
        });
    });

    /** A store born from a shared object would leak what one origin fed into the next. */
    it('hands out a fresh slice each time', () => {
        const first = initialConnectionsSlice();
        const second = initialConnectionsSlice();

        first.connections.push({
            id: 'one',
            name: 'one',
            transport: 'websocket',
            url: 'ws://localhost',
            headers: [],
            environmentId: null,
        });

        expect(second.connections).toEqual([]);
    });

    it('answers that nothing is recording, with a value no one can change', () => {
        expect(RESTING_RECORDING).toEqual({ active: false, entries: 0 });
        expect(Object.isFrozen(RESTING_RECORDING)).toBe(true);
    });
});
