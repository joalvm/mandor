import { failure, success } from '@mandor/ipc';
import { bridge, shellStore } from '@mandor/shell';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { docsStore } from '../src/docs-store.js';
import { deleteDoc } from '../src/lib/delete-doc.js';

const README = 'mandor://local-apis/events/doc/readme.md';
const BOTH = [
    { name: 'readme.md', title: 'readme' },
    { name: 'guia.md', title: 'guia' },
];

beforeEach(() => {
    vi.restoreAllMocks();
    docsStore.getState().reset();
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local APIs', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });
    docsStore.getState().setDocs(BOTH);
    docsStore.getState().setText(README, '# Readme\n');
});

afterEach(() => {
    shellStore.getState().reset();
});

describe('deleting one doc', () => {
    it('asks disk for that file, lists the folder again and lets go of its text', async () => {
        const remove = vi.spyOn(bridge.doc, 'delete').mockResolvedValue(success({}));

        vi.spyOn(bridge.doc, 'list').mockResolvedValue(
            success([{ name: 'guia.md', title: 'guia' }]),
        );

        await deleteDoc('events', 'readme.md');

        expect(remove).toHaveBeenCalledWith({ workspaceId: 'events', name: 'readme.md' });
        expect(docsStore.getState().docs).toEqual([{ name: 'guia.md', title: 'guia' }]);
        expect(docsStore.getState().texts[README]).toBeUndefined();
    });

    it('says what disk refused and leaves the list as it was', async () => {
        vi.spyOn(bridge.doc, 'delete').mockResolvedValue(failure('fs-write', 'no'));

        await deleteDoc('events', 'readme.md');

        expect(docsStore.getState().error).toBe('fs-write');
        expect(docsStore.getState().docs).toEqual(BOTH);
    });
});
