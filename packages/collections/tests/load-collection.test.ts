import { success } from '@mandor/ipc';
import type { CollectionNode } from '@mandor/schema';
import { bridge } from '@mandor/shell';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { collectionStore } from '../src/collection-store.js';
import { loadCollection } from '../src/lib/load-collection.js';

function item(name: string): CollectionNode {
    return { kind: 'item', itemKind: 'message', name, path: name, tags: [] };
}

afterEach(() => {
    vi.restoreAllMocks();
    collectionStore.getState().reset();
});

describe('loadCollection', () => {
    it('keeps on screen the tree of the workspace asked for last, whichever answers last', async () => {
        const answers = new Map<string, (nodes: CollectionNode[]) => void>();

        vi.spyOn(bridge.collections, 'tree').mockImplementation(
            ({ workspaceId }) =>
                new Promise((resolve) => {
                    answers.set(workspaceId, (nodes) => {
                        resolve(success(nodes));
                    });
                }),
        );

        const left = loadCollection('left');
        const opened = loadCollection('opened');

        answers.get('opened')?.([item('opened')]);
        await opened;
        answers.get('left')?.([item('left')]);
        await left;

        expect(collectionStore.getState().nodes.map((node) => node.name)).toEqual(['opened']);
    });
});
