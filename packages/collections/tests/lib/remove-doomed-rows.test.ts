import { ROOT_GROUP_ID, success } from '@mandor/ipc';
import { bridge, shellStore } from '@mandor/shell';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { collectionStore } from '../../src/collection-store.js';
import { removeDoomedRows } from '../../src/lib/remove-doomed-rows.js';
import { splitDeleting } from '../../src/lib/split-deleting.js';

import {
    declareRequestWithExamples,
    EXAMPLE_CREADO,
    EXAMPLE_ROTO,
    exampleSpies,
    WITH_EXAMPLES,
} from '../support/login-with-examples.js';

let undo: () => void = () => undefined;

beforeEach(() => {
    vi.restoreAllMocks();
    collectionStore.getState().reset();
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local APIs', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });
    vi.spyOn(bridge.collections, 'tree').mockResolvedValue(success([]));
});

afterEach(() => {
    undo();
    shellStore.getState().reset();
});

describe('taking out what the question was answered yes to (removeDoomedRows)', () => {
    it('hands the examples of one item to the app once, and leaves their tabs pointing at nothing', async () => {
        const spies = exampleSpies();

        undo = declareRequestWithExamples(spies);
        shellStore
            .getState()
            .openTab(ROOT_GROUP_ID, { id: 'one', kind: 'example', resource: EXAMPLE_CREADO });

        await removeDoomedRows(
            'events',
            splitDeleting(WITH_EXAMPLES, ['acceso/login:Creado', 'acceso/login:Roto']),
        );

        expect(spies.remove).toHaveBeenCalledTimes(1);
        expect(spies.remove).toHaveBeenCalledWith([EXAMPLE_CREADO, EXAMPLE_ROTO]);
        expect(shellStore.getState().resources[EXAMPLE_CREADO]?.missing).toBe(true);
    });

    it('reads the tree again after the examples, even when no node was deleted', async () => {
        undo = declareRequestWithExamples(exampleSpies());

        await removeDoomedRows('events', splitDeleting(WITH_EXAMPLES, ['acceso/login:Roto']));

        expect(bridge.collections.tree).toHaveBeenCalledTimes(1);
    });

    it('deletes the nodes too when the two are mixed', async () => {
        const remove = vi.spyOn(bridge.collections, 'delete').mockResolvedValue(success({}));

        undo = declareRequestWithExamples(exampleSpies());

        await removeDoomedRows('events', splitDeleting(WITH_EXAMPLES, ['acceso']));

        expect(remove.mock.calls.map(([request]) => request.path)).toEqual(['acceso']);
    });

    it('leaves the tabs of an example alone when the app refused to delete it', async () => {
        const spies = exampleSpies();

        spies.remove.mockRejectedValue(new Error('denied'));
        undo = declareRequestWithExamples(spies);
        shellStore
            .getState()
            .openTab(ROOT_GROUP_ID, { id: 'one', kind: 'example', resource: EXAMPLE_ROTO });

        await expect(
            removeDoomedRows('events', splitDeleting(WITH_EXAMPLES, ['acceso/login:Roto'])),
        ).rejects.toThrow('denied');
        expect(shellStore.getState().resources[EXAMPLE_ROTO]?.missing).toBe(false);
    });
});
