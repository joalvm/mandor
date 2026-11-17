import { shellStore, type SearchEntry } from '@mandor/shell';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { collectionStore } from '../src/collection-store.js';
import { workspaceEntries } from '../src/search/workspace-entries.js';

import { TWO_FOLDERS } from './support/two-folders.js';

const ENVIRONMENT: SearchEntry = {
    name: 'Staging',
    resource: 'mandor://local/events/environment/staging',
    source: 'environment',
    tags: [],
    trail: '',
};

afterEach(() => {
    collectionStore.getState().reset();
    shellStore.getState().reset();
});

describe('what the search of the sidebar looks through', () => {
    it('is the groups and items of the open workspace and what every source brings for it', () => {
        const source = vi.fn(() => [ENVIRONMENT]);

        shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });
        collectionStore.getState().setNodes(TWO_FOLDERS);

        const entries = workspaceEntries([source], (key) => key);

        expect(source).toHaveBeenCalledWith('local', 'events', expect.any(Function));
        expect(entries.map((entry) => entry.source)).toEqual([
            'folder',
            'folder',
            'item',
            'item',
            'item',
            'item',
            'environment',
        ]);
        expect(entries.at(-1)).toBe(ENVIRONMENT);
    });

    it('is nothing while no workspace is open', () => {
        const source = vi.fn(() => [ENVIRONMENT]);

        expect(workspaceEntries([source], (key) => key)).toEqual([]);
        expect(source).not.toHaveBeenCalled();
    });
});
