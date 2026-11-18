import type { CollectionItem } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { childrenInOrder } from '../../src/workspace/children-in-order.js';
import type { WorkspaceFolderNode } from '../../src/workspace/workspace-data.js';

function item(name: string): CollectionItem {
    return { kind: 'request', name, tags: [], body: {} };
}

function level(parts: Partial<WorkspaceFolderNode>): WorkspaceFolderNode {
    return {
        name: 'L',
        settings: { variables: [], headers: [] },
        folders: [],
        items: [],
        ...parts,
    };
}

const FOLDERS = [level({ name: 'f0' }), level({ name: 'f1' })];
const ITEMS = [item('i0'), item('i1')];

function namesOf(sequence?: WorkspaceFolderNode['sequence']): string[] {
    return childrenInOrder(level({ folders: FOLDERS, items: ITEMS, sequence }), {
        folder: ({ name }, index) => [`${name}@${String(index)}`],
        item: ({ name }, index) => [`${name}@${String(index)}`],
    });
}

describe('childrenInOrder', () => {
    it('goes folders first when nothing says otherwise', () => {
        expect(namesOf()).toEqual(['f0@0', 'f1@1', 'i0@0', 'i1@1']);
    });

    it('follows the sequence, each thing with its place among its kind', () => {
        expect(namesOf(['item', 'folder', 'item', 'folder'])).toEqual([
            'i0@0',
            'f0@0',
            'i1@1',
            'f1@1',
        ]);
    });

    it('writes after it what the sequence does not reach, and ignores what it says too much', () => {
        expect(namesOf(['item'])).toEqual(['i0@0', 'f0@0', 'f1@1', 'i1@1']);
        expect(
            childrenInOrder(level({ sequence: ['folder', 'item'] }), {
                folder: () => ['nada'],
                item: () => ['nada'],
            }),
        ).toEqual([]);
    });
});
