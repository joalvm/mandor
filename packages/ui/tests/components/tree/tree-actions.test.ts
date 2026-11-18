import { describe, expect, it, vi } from 'vitest';

import { collapse, press, type TreeState } from '../../../src/components/tree/tree-actions.js';
import type { TreeLine } from '../../../src/components/tree/tree-line.js';

const LINES: readonly TreeLine[] = [
    { expanded: true, id: 'orders', level: 1 },
    { id: 'orders/created', level: 2 },
    { id: 'readme', level: 1 },
];

const PLAIN = { altKey: false, ctrlKey: false, keep: false, metaKey: false, shiftKey: false };

/** A tree as its actions find it, with no DOM around it: the focus is nowhere in the tree. */
function treeOf(state: Partial<TreeState>): TreeState {
    return {
        anchor: { current: null },
        focus: { claim: vi.fn(), claimed: vi.fn(), id: null, pending: false, take: vi.fn() },
        lines: LINES,
        onExpandedChange: vi.fn(),
        scrollTo: vi.fn(),
        scroller: { current: null },
        selected: [],
        ...state,
    };
}

describe('what a tree does when asked', () => {
    it('takes the line pressed, anchors the next range there and opens it', () => {
        const onActivate = vi.fn();
        const onSelectedChange = vi.fn();
        const tree = treeOf({ onActivate, onSelectedChange, selected: ['orders'] });

        press(tree, 2, PLAIN);

        expect(onSelectedChange).toHaveBeenCalledWith(['readme']);
        expect(onActivate).toHaveBeenCalledWith('readme', PLAIN);
        expect(tree.anchor.current).toBe('readme');
        expect(tree.focus.take).toHaveBeenCalledWith('readme');
    });

    it('lets go of what a fold hides and moves the anchor out of it', () => {
        const onSelectedChange = vi.fn();
        const tree = treeOf({
            anchor: { current: 'orders/created' },
            onSelectedChange,
            selected: ['orders/created', 'readme'],
        });

        collapse(tree, 0);

        expect(onSelectedChange).toHaveBeenCalledWith(['readme']);
        expect(tree.anchor.current).toBe('orders');
        expect(tree.onExpandedChange).toHaveBeenCalledWith('orders', false);
    });

    /** A fold from outside the tree writes the focus down without pulling it into the tree. */
    it('writes the focus down on the folder when it was not inside the tree', () => {
        const tree = treeOf({});

        tree.focus.id = 'orders/created';
        collapse(tree, 0);

        expect(tree.focus.take).toHaveBeenCalledWith('orders');
        expect(tree.focus.claim).not.toHaveBeenCalled();
        expect(tree.scrollTo).not.toHaveBeenCalled();
    });
});
