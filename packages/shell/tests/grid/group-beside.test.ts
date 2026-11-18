import type { GridNode } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { groupBeside } from '../../src/grid/group-beside.js';

function leaf(id: string): GridNode {
    return { activeTab: null, id, kind: 'leaf', tabs: [] };
}

const THREE: GridNode = {
    axis: 'row',
    children: [leaf('root'), leaf('group-2'), leaf('group-3')],
    kind: 'branch',
    sizes: [34, 33, 33],
};

describe('the group next door', () => {
    it('is the next one along', () => {
        expect(groupBeside(THREE, 'root')).toBe('group-2');
        expect(groupBeside(THREE, 'group-2')).toBe('group-3');
    });

    it('is the first again once the last is reached', () => {
        expect(groupBeside(THREE, 'group-3')).toBe('root');
    });

    it('is nobody in a window with a single group', () => {
        expect(groupBeside(leaf('root'), 'root')).toBeNull();
    });
});
