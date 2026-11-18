import type { GridNode } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { nextGroupId } from '../../src/grid/group-id.js';

function leaf(id: string): GridNode {
    return { activeTab: null, id, kind: 'leaf', tabs: [] };
}

function row(...ids: string[]): GridNode {
    return {
        axis: 'row',
        children: ids.map(leaf),
        kind: 'branch',
        sizes: ids.map(() => 100 / ids.length),
    };
}

describe('naming a new group', () => {
    it('starts the numbering at two, because the root has its own name', () => {
        expect(nextGroupId(leaf('root'))).toBe('group-2');
    });

    it('takes the lowest free number after the ones in use', () => {
        expect(nextGroupId(row('root', 'group-2', 'group-3'))).toBe('group-4');
    });

    it('takes back a number a closed group left free', () => {
        expect(nextGroupId(row('root', 'group-3'))).toBe('group-2');
    });
});
