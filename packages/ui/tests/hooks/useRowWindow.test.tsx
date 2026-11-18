import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { TABLE_ROW_HEIGHT } from '../../src/components/table/table-row-height.js';
import { RowLabel, Tree, TreeRow, useRowWindow, type TreeLine } from '../../src/index.js';
import { scaleTokenValues } from '../../src/styles/token-scale-values.js';

/** One line of the tree is one row of the scale, whatever it measures today. */
const ROW = Number.parseFloat(scaleTokenValues['mandor-height-row']);

const LINES: readonly TreeLine[] = Array.from({ length: 500 }, (_, index) => ({
    id: `line-${String(index)}`,
    level: 1,
}));

function LongTree() {
    const [selected, setSelected] = useState<string[]>([]);

    return (
        <Tree
            label="Largo"
            lines={LINES}
            onExpandedChange={() => undefined}
            onSelectedChange={setSelected}
            selected={selected}
        >
            {LINES.map((line) => (
                <TreeRow key={line.id}>
                    <RowLabel>{line.id}</RowLabel>
                </TreeRow>
            ))}
        </Tree>
    );
}

function line(name: string): HTMLElement {
    return screen.getByRole('treeitem', { name });
}

/** jsdom lays nothing out, so the scroll is written where the window reads it. */
function scrolledTo(index: number): void {
    const tree = screen.getByRole('tree');

    tree.scrollTop = index * ROW;
    fireEvent.scroll(tree);
}

/** A list of five hundred table rows, with its height written down. */
function TallRows({ rowHeight }: { rowHeight?: number }) {
    const view = useRowWindow({
        count: 500,
        keyOf: (index) => index,
        rowHeight,
        scroller: () => null,
    });

    return <output aria-label="Total">{view.total}</output>;
}

describe('the window of a long list of rows, under a tree (useRowWindow)', () => {
    it('draws a screenful of lines and not the whole tree', () => {
        render(<LongTree />);

        const drawn = screen.getAllByRole('treeitem');

        expect(drawn.length).toBeLessThan(40);
        expect(drawn[0]).toHaveAccessibleName('line-0');
    });

    it('draws the lines a scroll brings into view, where they stand in the whole tree', () => {
        render(<LongTree />);
        scrolledTo(300);

        expect(line('line-300').parentElement).toHaveAttribute(
            'data-offset',
            `${String(300 * ROW)}px`,
        );
        expect(screen.queryByRole('treeitem', { name: 'line-100' })).toBeNull();
    });

    /** The arrow decides where the focus goes before that line is drawn: useTreeFocus claims it. */
    it('brings the focus to a line that stood out of the window', () => {
        render(<LongTree />);
        act(() => {
            line('line-0').focus();
        });

        fireEvent.keyDown(line('line-0'), { key: 'End' });

        expect(line('line-499')).toHaveFocus();
        expect(line('line-499')).toHaveAttribute('tabindex', '0');
    });

    /** Taking the focused line out of the DOM would throw the focus to the page. */
    it('keeps the focused line drawn when a scroll takes it out of sight', () => {
        render(<LongTree />);
        act(() => {
            line('line-0').focus();
        });

        scrolledTo(300);

        expect(line('line-0')).toHaveFocus();
        expect(line('line-300')).toBeInTheDocument();
        expect(screen.getAllByRole('treeitem').filter((one) => one.tabIndex === 0)).toEqual([
            line('line-0'),
        ]);
    });
    /** A table row stands taller than a line: counted at a line, a long table comes out short. */
    it('counts the rows nobody measured at the height their list gives', () => {
        render(<TallRows rowHeight={TABLE_ROW_HEIGHT} />);

        expect(screen.getByRole('status', { name: 'Total' })).toHaveTextContent(
            String(500 * TABLE_ROW_HEIGHT),
        );
    });

    it('counts them as lines of the scale when the list gives no height', () => {
        render(<TallRows />);

        expect(screen.getByRole('status', { name: 'Total' })).toHaveTextContent(String(500 * ROW));
    });
});
