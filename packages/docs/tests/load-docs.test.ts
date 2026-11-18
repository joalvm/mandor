import { success, type ListedDoc } from '@mandor/ipc';
import { bridge } from '@mandor/shell';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { docsStore } from '../src/docs-store.js';
import { loadDocs } from '../src/lib/load-docs.js';

afterEach(() => {
    vi.restoreAllMocks();
    docsStore.getState().reset();
});

describe('loadDocs', () => {
    it('keeps on screen the docs of the workspace asked for last, whichever answers last', async () => {
        const answers = new Map<string, (docs: ListedDoc[]) => void>();

        vi.spyOn(bridge.doc, 'list').mockImplementation(
            ({ workspaceId }) =>
                new Promise((resolve) => {
                    answers.set(workspaceId, (docs) => {
                        resolve(success(docs));
                    });
                }),
        );

        const left = loadDocs('left');
        const opened = loadDocs('opened');

        answers.get('opened')?.([{ name: 'opened.md', title: 'Opened' }]);
        await opened;
        answers.get('left')?.([{ name: 'left.md', title: 'Left' }]);
        await left;

        expect(docsStore.getState().docs).toEqual([{ name: 'opened.md', title: 'Opened' }]);
    });
});
