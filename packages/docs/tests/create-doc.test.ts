import { failure, success } from '@mandor/ipc';
import { bridge, selectTabs, shellStore } from '@mandor/shell';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { docsStore } from '../src/docs-store.js';
import { createDoc } from '../src/lib/create-doc.js';

const MINTED = 'k3m9x2q7a4bd.md';

beforeEach(() => {
    vi.restoreAllMocks();
    docsStore.getState().reset();
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local APIs', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });
    docsStore.getState().setDocs([{ name: 'readme.md', title: 'readme' }]);
});

afterEach(() => {
    shellStore.getState().reset();
});

describe('making one doc', () => {
    it('asks for a title and opens the file main drew for it', async () => {
        const create = vi.spyOn(bridge.doc, 'create').mockResolvedValue(success(MINTED));

        vi.spyOn(bridge.doc, 'list').mockResolvedValue(
            success([
                { name: MINTED, title: 'notas' },
                { name: 'readme.md', title: 'readme' },
            ]),
        );

        await createDoc('events', 'notas');

        expect(create).toHaveBeenCalledWith({ workspaceId: 'events', title: 'notas' });
        expect(docsStore.getState().docs).toEqual([
            { name: MINTED, title: 'notas' },
            { name: 'readme.md', title: 'readme' },
        ]);
        expect(selectTabs(shellStore.getState()).map((tab) => tab.resource)).toEqual([
            `mandor://local-apis/events/doc/${MINTED}`,
        ]);
        expect(docsStore.getState().renaming).toBe(MINTED);
    });

    it('numbers the title when another doc already wears it', async () => {
        const create = vi.spyOn(bridge.doc, 'create').mockResolvedValue(success(MINTED));

        vi.spyOn(bridge.doc, 'list').mockResolvedValue(success([]));

        await createDoc('events', 'readme');

        expect(create).toHaveBeenCalledWith({ workspaceId: 'events', title: 'readme 2' });
    });

    /** A refusal is not a doc: nothing opens, and the list stays the one that is on disk. */
    it('says what disk refused and opens nothing', async () => {
        vi.spyOn(bridge.doc, 'create').mockResolvedValue(failure('fs-write', 'no'));
        const list = vi.spyOn(bridge.doc, 'list');

        await createDoc('events', 'notas');

        expect(docsStore.getState().error).toBe('fs-write');
        expect(docsStore.getState().docs).toEqual([{ name: 'readme.md', title: 'readme' }]);
        expect(list).not.toHaveBeenCalled();
        expect(selectTabs(shellStore.getState())).toEqual([]);
    });
});
