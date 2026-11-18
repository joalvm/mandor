import type { GridNode } from '@mandor/ipc';
import { renderHook } from '@testing-library/react';
import type { DockviewApi } from 'dockview';
import { describe, expect, it, vi } from 'vitest';

import { useDrawnGrid } from '../../src/hooks/useDrawnGrid.js';
import type { Tab } from '../../src/tab/tab.js';

function tab(id: string): Tab {
    return { id, kind: 'doc', resource: `mandor://demo/payments/doc/${id}.md` };
}

function split(front: string, more: readonly Tab[] = []): GridNode {
    return {
        kind: 'branch',
        axis: 'row',
        sizes: [50, 50],
        children: [
            { kind: 'leaf', id: 'root', tabs: [tab('one'), tab('two'), ...more], activeTab: front },
            { kind: 'leaf', id: 'g1', tabs: [tab('three')], activeTab: 'three' },
        ],
    };
}

/** A view of the test: it builds nothing, and counts how often it was asked to. */
function viewOf() {
    const fromJSON = vi.fn();
    const setActive = vi.fn();
    const groups = new Map([
        ['root', { id: 'root', panels: [], api: { setActive } }],
        ['g1', { id: 'g1', panels: [], api: { setActive } }],
    ]);
    const view = {
        activeGroup: { id: 'root' },
        fromJSON,
        getGroup: (id: string) => groups.get(id),
        groups: [],
    } as unknown as DockviewApi;

    return { fromJSON, setActive, view };
}

type Drawn = { activeGroupId: string; redrawn: number; shown: GridNode };

function drawn(view: DockviewApi, initialProps: Drawn) {
    return renderHook((props: Drawn) => useDrawnGrid(view, { ...props, names: [] }), {
        initialProps,
    });
}

describe('drawing the tree in the view', () => {
    it('builds once, and only points into it when another tab or group comes to the front', () => {
        const { fromJSON, setActive, view } = viewOf();
        const { rerender } = drawn(view, {
            activeGroupId: 'root',
            redrawn: 0,
            shown: split('one'),
        });

        rerender({ activeGroupId: 'root', redrawn: 0, shown: split('two') });
        rerender({ activeGroupId: 'g1', redrawn: 0, shown: split('two') });

        expect(fromJSON).toHaveBeenCalledTimes(1);
        expect(setActive).toHaveBeenCalledTimes(1);
    });

    it('builds again when a tab arrives, and when a redraw is asked for', () => {
        const { fromJSON, view } = viewOf();
        const { rerender } = drawn(view, {
            activeGroupId: 'root',
            redrawn: 0,
            shown: split('one'),
        });

        rerender({ activeGroupId: 'root', redrawn: 0, shown: split('one', [tab('four')]) });
        rerender({ activeGroupId: 'root', redrawn: 1, shown: split('one', [tab('four')]) });

        expect(fromJSON).toHaveBeenCalledTimes(3);
    });

    it('answers the structure it built, which a click does not change', () => {
        const { view } = viewOf();
        const { rerender, result } = drawn(view, {
            activeGroupId: 'root',
            redrawn: 0,
            shown: split('one'),
        });
        const built = result.current.structure;

        rerender({ activeGroupId: 'g1', redrawn: 0, shown: split('two') });

        expect(result.current.structure).toBe(built);
        expect(result.current.blanks).toEqual([]);
    });
});
