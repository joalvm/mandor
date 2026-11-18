import type { GridNode } from '@mandor/ipc';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { dropUnknownKinds } from '../../src/grid/drop-unknown-kinds.js';
import type { Tab } from '../../src/tab/tab.js';
import { declareTabKindSpec } from '../../src/testing/tab-kind.js';

let undo: () => void;

function tab(id: string, kind: string): Tab {
    return { id, kind, resource: `mandor://demo/${id}` };
}

function leaf(id: string, active: string | null, ...tabs: Tab[]): GridNode {
    return { activeTab: active, id, kind: 'leaf', tabs };
}

beforeEach(() => {
    undo = declareTabKindSpec({
        closable: true,
        icon: 'doc',
        id: 'doc',
        title: (resource) => resource,
    });
});

afterEach(() => {
    undo();
});

describe('restoring a window with a kind this build no longer draws', () => {
    it('leaves a window whose kinds are all known as it was', () => {
        const grid = leaf('root', 'a', tab('a', 'doc'), tab('b', 'doc'));

        expect(dropUnknownKinds(grid)).toEqual(grid);
    });

    it('drops the tabs of an unknown kind and shows the first one left when the shown one went', () => {
        const grid = leaf('root', 'x', tab('x', 'gone'), tab('a', 'doc'));

        expect(dropUnknownKinds(grid)).toEqual(leaf('root', 'a', tab('a', 'doc')));
    });

    it('keeps showing the tab that was shown when it stays', () => {
        const grid = leaf('root', 'b', tab('x', 'gone'), tab('a', 'doc'), tab('b', 'doc'));

        expect(dropUnknownKinds(grid)).toMatchObject({ activeTab: 'b' });
    });

    it('closes the group the drop left empty and gives its space to the one beside', () => {
        const left = leaf('root', 'a', tab('a', 'doc'));
        const grid: GridNode = {
            axis: 'row',
            children: [left, leaf('group-2', 'x', tab('x', 'gone'))],
            kind: 'branch',
            sizes: [50, 50],
        };

        expect(dropUnknownKinds(grid)).toEqual(left);
    });

    it('empties the root rather than removing it when nothing is left to draw', () => {
        expect(dropUnknownKinds(leaf('root', 'x', tab('x', 'gone')))).toEqual(leaf('root', null));
    });
});
