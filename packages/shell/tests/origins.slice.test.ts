import type { Origin } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { initialOriginsSlice, originsActionsFor, type OriginsSlice } from '../src/origins.slice.js';

function actions() {
    let slice: OriginsSlice = initialOriginsSlice();
    const api = originsActionsFor((partial) => {
        slice = { ...slice, ...partial };
    });

    return { api, read: () => slice };
}

describe('the origins the window knows', () => {
    it('is born with none open, none known and nothing switching', () => {
        expect(initialOriginsSlice()).toEqual({
            activeOriginId: null,
            origins: [],
            switchingOrigin: false,
            syncState: null,
        });
    });

    it('keeps a copy of the list main sent, not the list itself', () => {
        const { api, read } = actions();
        const sent: Origin[] = [{ id: 'local', kind: 'local', name: 'Local' }];

        api.setOrigins(sent);
        sent.push({ id: 'o-1', kind: 'remote', name: 'Team' });

        expect(read().origins).toEqual([{ id: 'local', kind: 'local', name: 'Local' }]);
    });

    it('says when a switch is running and when it is over', () => {
        const { api, read } = actions();

        api.setSwitchingOrigin(true);

        expect(read().switchingOrigin).toBe(true);

        api.setSwitchingOrigin(false);

        expect(read().switchingOrigin).toBe(false);
    });

    it('holds where the open origin stands against its remote, and forgets it between origins', () => {
        const { api, read } = actions();

        api.setSyncState({ busy: true, state: 'ahead' });

        expect(read().syncState).toEqual({ busy: true, state: 'ahead' });

        api.setSyncState(null);

        expect(read().syncState).toBeNull();
    });
});
