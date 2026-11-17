import { describe, expect, it } from 'vitest';

import {
    forgetSyncState,
    onSyncStateChanged,
    setSyncState,
    syncStateOf,
} from '../../src/sync/sync-state.js';

describe('the state of the synchronization of a repo', () => {
    it('is nothing until a loop says something about the repo', () => {
        expect(syncStateOf('/repo/none')).toBeNull();
    });

    it('keeps the last state set, per repo', () => {
        setSyncState('/repo/a', { state: 'clean', busy: false });
        setSyncState('/repo/b', { state: 'error', busy: false });

        expect(syncStateOf('/repo/a')).toEqual({ state: 'clean', busy: false });
        expect(syncStateOf('/repo/b')).toEqual({ state: 'error', busy: false });

        forgetSyncState('/repo/a');
        forgetSyncState('/repo/b');
    });

    it('tells the listeners a change, and says the same state only once', () => {
        const heard: unknown[] = [];
        const stop = onSyncStateChanged((root, state) => heard.push([root, state]));

        setSyncState('/repo/c', { state: 'clean', busy: true });
        setSyncState('/repo/c', { state: 'clean', busy: true });
        setSyncState('/repo/c', { state: 'clean', busy: false });
        stop();
        setSyncState('/repo/c', { state: 'error', busy: false });

        expect(heard).toEqual([
            ['/repo/c', { state: 'clean', busy: true }],
            ['/repo/c', { state: 'clean', busy: false }],
        ]);

        forgetSyncState('/repo/c');
    });

    it('forgets a repo, so the next state is news again', () => {
        const heard: unknown[] = [];
        const stop = onSyncStateChanged((_root, state) => heard.push(state));

        setSyncState('/repo/d', { state: 'clean', busy: false });
        forgetSyncState('/repo/d');
        setSyncState('/repo/d', { state: 'clean', busy: false });
        stop();

        expect(heard).toHaveLength(2);

        forgetSyncState('/repo/d');
    });
});
