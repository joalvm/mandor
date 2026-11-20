import { fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    IconButton,
    Table,
    TableHead,
    TableHeaderCell,
    TableLeadCell,
    TableRowActions,
    TableTools,
    TooltipProvider,
    type TableColumn,
} from '../../../src/index.js';
import { useTableContext } from '../../../src/components/table/table-context.js';
import { allByPart } from '../../../src/testing/by-part.js';

const COLUMNS: readonly TableColumn[] = [
    { id: 'check', kind: 'fixed', size: 'check' },
    { id: 'name', kind: 'fluid', min: 'md', weight: 1 },
    { id: 'value', kind: 'fluid', min: 'md', weight: 1 },
    { id: 'note', kind: 'fluid', min: 'sm', weight: 1 },
];

function headers(): void {
    render(
        <TooltipProvider>
            <Table columns={COLUMNS} label="Headers">
                <TableHead>
                    <TableHeaderCell column="check">
                        <span className="sr-only">Sends</span>
                    </TableHeaderCell>
                    <TableHeaderCell column="name">Name</TableHeaderCell>
                    <TableHeaderCell column="value">Value</TableHeaderCell>
                    <TableHeaderCell column="note">Note</TableHeaderCell>
                    <TableTools label="Actions">
                        <IconButton icon="copy" label="Copy all" size="sm" />
                    </TableTools>
                </TableHead>
                <tbody>
                    <tr>
                        <TableLeadCell>x</TableLeadCell>
                        <td>accept</td>
                        <td>*/*</td>
                        <td />
                        <TableRowActions>
                            <IconButton icon="copy" label="Copy accept" size="sm" />
                        </TableRowActions>
                    </tr>
                </tbody>
            </Table>
        </TooltipProvider>,
    );
}

afterEach(() => {
    vi.restoreAllMocks();
});

function template(): string {
    return screen.getByRole('table', { name: 'Headers' }).style.getPropertyValue('--table-columns');
}

/** The edge of a column whose cell the browser would measure `width` pixels wide. */
function edgeOf(name: string, width: number): HTMLElement {
    const cell = screen.getByRole('columnheader', { name });
    const [edge] = allByPart('table-resize', cell);

    if (edge === undefined) {
        throw new Error(`the column ${name} has no edge`);
    }

    cell.getBoundingClientRect = () => new DOMRect(0, 0, width, 28);
    edge.setPointerCapture = () => undefined;

    return edge;
}

describe('a table', () => {
    it('is announced by what it is a table of', () => {
        headers();

        expect(screen.getByRole('table', { name: 'Headers' })).toBeVisible();
    });

    /** `useTableColumns` writes the grid on the table, the one the head and the rows share. */
    it('lays the head and the rows on the grid its columns make', () => {
        headers();

        expect(template()).toBe(
            'calc(var(--mandor-height-field) - 2 * var(--mandor-gap-tight)) ' +
                'minmax(9rem, 1fr) minmax(9rem, 1fr) ' +
                'minmax(max(6rem, calc(var(--table-tools-width, 0px) + 4rem)), 1fr)',
        );
    });

    /**
     * `useCoverWidth` writes how wide what lies over the end of a row stands: the name of the
     * last column ends where the tools begin, and a cell being written ends where the actions of
     * its row begin. To the fraction of a pixel: a frame drawn up to them, rounded, slips under.
     */
    it('measures the tools of the head and the actions of a row for what they cover', () => {
        vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
            this: Element,
        ) {
            return new DOMRect(
                0,
                0,
                this.getAttribute('data-part') === 'table-tools' ? 120.5 : 40.25,
                28,
            );
        });
        headers();

        const actions = screen.getByRole('button', { name: 'Copy accept' }).closest('tr');

        expect(
            screen
                .getByRole('table', { name: 'Headers' })
                .style.getPropertyValue('--table-tools-width'),
        ).toBe('120.5px');
        expect(actions?.style.getPropertyValue('--table-row-actions-width')).toBe('40.25px');
    });

    it('moves only the edge it is dragged by, trading the width of the two columns beside it', () => {
        headers();

        const edge = edgeOf('Name', 200);

        fireEvent.pointerDown(edge, { clientX: 200, pointerId: 1 });
        fireEvent.pointerMove(edge, { clientX: 300, pointerId: 1 });
        fireEvent.pointerUp(edge, { pointerId: 1 });

        expect(template()).toContain(
            'minmax(9rem, 1.5fr) minmax(9rem, 0.5fr) ' +
                'minmax(max(6rem, calc(var(--table-tools-width, 0px) + 4rem)), 1fr)',
        );
    });

    it('stops following the pointer once it is let go', () => {
        headers();

        const edge = edgeOf('Name', 200);

        fireEvent.pointerDown(edge, { clientX: 200, pointerId: 1 });
        fireEvent.pointerUp(edge, { pointerId: 1 });
        fireEvent.pointerMove(edge, { clientX: 300, pointerId: 1 });

        expect(template()).toContain('minmax(9rem, 1fr) minmax(9rem, 1fr)');
    });

    it('gives an edge to every column but a fixed one and the last, whose edge is the frame', () => {
        headers();

        expect(allByPart('table-resize')).toHaveLength(2);
        expect(
            allByPart('table-resize', screen.getByRole('columnheader', { name: 'Note' })),
        ).toEqual([]);
    });

    it('names, for a screen reader, the column the actions of the rows stand in', () => {
        headers();

        expect(screen.getByRole('columnheader', { name: /Actions/ })).toBeVisible();
        expect(screen.getByRole('button', { name: 'Copy all' })).toBeVisible();
        expect(screen.getByRole('button', { name: 'Copy accept' })).toBeVisible();
    });

    /**
     * A table of fields keeps its rows still under the pointer: every field answers the pointer
     * on its own, and a row tinted behind them only muddies the white they are written on.
     * `table.css` lifts a row only on a table that does not say so.
     */
    it('lifts its rows under the pointer unless it is a table of fields', () => {
        render(
            <>
                <Table columns={COLUMNS} label="Read" />
                <Table columns={COLUMNS} label="Written" rowHover={false} />
            </>,
        );

        expect(screen.getByRole('table', { name: 'Read' })).not.toHaveAttribute('data-row-hover');
        expect(screen.getByRole('table', { name: 'Written' })).toHaveAttribute(
            'data-row-hover',
            'off',
        );
    });

    /**
     * A listing whose rows are things to act on keeps their actions in sight; a table of fields
     * shows them only under the pointer or the focus. `table.css` reads the mark.
     */
    it('keeps the actions of a row in sight only when the row asks for it', () => {
        render(
            <TooltipProvider>
                <Table columns={COLUMNS} label="Listing">
                    <tbody>
                        <tr>
                            <td>Team</td>
                            <TableRowActions reveal="always">
                                <IconButton icon="copy" label="Copy team" size="sm" />
                            </TableRowActions>
                        </tr>
                        <tr>
                            <td>accept</td>
                            <TableRowActions>
                                <IconButton icon="copy" label="Copy accept" size="sm" />
                            </TableRowActions>
                        </tr>
                    </tbody>
                </Table>
            </TooltipProvider>,
        );

        const [always, hover] = allByPart('table-row-actions');

        expect(always).toHaveAttribute('data-reveal', 'always');
        expect(hover).toHaveAttribute('data-reveal', 'hover');
    });

    it('refuses a cell of the head outside a table', () => {
        const quiet = vi.spyOn(console, 'error').mockImplementation(() => undefined);

        expect(() => renderHook(() => useTableContext())).toThrow('TableHeaderCell outside Table');
        quiet.mockRestore();
    });
});
