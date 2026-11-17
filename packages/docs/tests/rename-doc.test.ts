import { failure, success } from '@mandor/ipc';
import { bridge, selectTabs, shellStore } from '@mandor/shell';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { docsStore } from '../src/docs-store.js';
import { openDoc } from '../src/lib/open-doc.js';
import { renameDoc } from '../src/lib/rename-doc.js';

const README = 'mandor://local-apis/events/doc/k3m9x2q7a4bd.md';

function openResources(): string[] {
    return selectTabs(shellStore.getState()).map((tab) => tab.resource);
}

beforeEach(() => {
    vi.restoreAllMocks();
    docsStore.getState().reset();
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local APIs', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });
    docsStore.getState().setDocs([{ name: 'k3m9x2q7a4bd.md', title: 'readme' }]);
    openDoc('events', 'k3m9x2q7a4bd.md');
});

afterEach(() => {
    shellStore.getState().reset();
});

describe('renaming one doc', () => {
    it('sends the title for that file, lists again and leaves the open tab where it is', async () => {
        const rename = vi.spyOn(bridge.doc, 'rename').mockResolvedValue(success({}));

        vi.spyOn(bridge.doc, 'list').mockResolvedValue(
            success([{ name: 'k3m9x2q7a4bd.md', title: 'guia' }]),
        );

        await renameDoc('events', 'k3m9x2q7a4bd.md', 'guia');

        expect(rename).toHaveBeenCalledWith({
            workspaceId: 'events',
            name: 'k3m9x2q7a4bd.md',
            title: 'guia',
        });
        expect(docsStore.getState().docs).toEqual([{ name: 'k3m9x2q7a4bd.md', title: 'guia' }]);
        expect(openResources()).toEqual([README]);
    });

    /** Nothing changes on a refusal: the title is still the one it was, and so is the tab. */
    it('says what disk refused and leaves the list and the tab as they were', async () => {
        vi.spyOn(bridge.doc, 'rename').mockResolvedValue(failure('fs-write', 'no'));

        await renameDoc('events', 'k3m9x2q7a4bd.md', 'notas');

        expect(docsStore.getState().error).toBe('fs-write');
        expect(docsStore.getState().docs).toEqual([{ name: 'k3m9x2q7a4bd.md', title: 'readme' }]);
        expect(openResources()).toEqual([README]);
    });

    it('asks nothing of disk when the title did not change', async () => {
        const rename = vi.spyOn(bridge.doc, 'rename');

        await renameDoc('events', 'k3m9x2q7a4bd.md', 'readme');

        expect(rename).not.toHaveBeenCalled();
    });
});
