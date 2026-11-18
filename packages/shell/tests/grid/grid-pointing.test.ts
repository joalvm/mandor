import type { GridNode } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { gridPointingOf, gridStructureOf } from '../../src/grid/grid-pointing.js';
import type { Tab } from '../../src/tab/tab.js';

function tab(id: string): Tab {
    return { id, kind: 'doc', resource: `mandor://demo/payments/doc/${id}.md` };
}

function split(left: string | null, right: string | null): GridNode {
    return {
        kind: 'branch',
        axis: 'row',
        sizes: [50, 50],
        children: [
            { kind: 'leaf', id: 'root', tabs: [tab('one'), tab('two')], activeTab: left },
            { kind: 'leaf', id: 'g1', tabs: [tab('three')], activeTab: right },
        ],
    };
}

function titleOf(each: Tab): string {
    return `title of ${each.id}`;
}

describe('telling the build of a grid from the pointing into it', () => {
    it('builds the same grid whichever tab of a group is in front', () => {
        expect(gridStructureOf(split('one', 'three'), titleOf)).toBe(
            gridStructureOf(split('two', null), titleOf),
        );
    });

    it('builds again when a title changes, since the strip draws it', () => {
        expect(gridStructureOf(split('one', 'three'), titleOf)).not.toBe(
            gridStructureOf(split('one', 'three'), (each) => each.id),
        );
    });

    it('changes the pointing with the tab in front and with the group in front', () => {
        const pointing = gridPointingOf(split('one', 'three'), 'root');

        expect(gridPointingOf(split('two', 'three'), 'root')).not.toBe(pointing);
        expect(gridPointingOf(split('one', 'three'), 'g1')).not.toBe(pointing);
        expect(gridPointingOf(split('one', 'three'), 'root')).toBe(pointing);
    });
});
