import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ListRow, RowLabel } from '../../../src/index.js';

function row(props: {
    density?: 'line' | 'pair' | 'row';
    id?: string;
    level?: number;
    tabIndex?: number;
}): void {
    render(
        <div aria-label="Conexiones" role="listbox">
            <ListRow onSelect={vi.fn()} selected={false} {...props}>
                <RowLabel>gateway</RowLabel>
            </ListRow>
        </div>,
    );
}

describe('a row of a list', () => {
    it('only looks on a click and keeps on the second click of a double one', () => {
        const onSelect = vi.fn();

        render(
            <ListRow onSelect={onSelect} selected={false}>
                <RowLabel>gateway</RowLabel>
            </ListRow>,
        );
        fireEvent.click(screen.getByRole('option', { name: 'gateway' }), { detail: 1 });
        fireEvent.click(screen.getByRole('option', { name: 'gateway' }), { detail: 2 });

        expect(onSelect).toHaveBeenNthCalledWith(1, expect.objectContaining({ keep: false }));
        expect(onSelect).toHaveBeenNthCalledWith(2, expect.objectContaining({ keep: true }));
    });

    it('is a stop of the tabulator on its own, like every row of a plain list', () => {
        row({});

        expect(screen.getByRole('option', { name: 'gateway' })).toHaveAttribute('tabindex', '0');
    });

    /**
     * A list whose container walks its rows by hand — the palette of commands, the register of
     * activity — keeps the tabulator out of the rows, the way a checkbox inside a line of the
     * tree steps out of it.
     */
    it('leaves the tabulator out when the container owns the keyboard', () => {
        row({ tabIndex: -1 });

        expect(screen.getByRole('option', { name: 'gateway' })).toHaveAttribute('tabindex', '-1');
    });

    it('carries the id a field points at while the focus stays in the field', () => {
        row({ id: 'gateway-row' });

        expect(screen.getByRole('option', { name: 'gateway' })).toHaveAttribute(
            'id',
            'gateway-row',
        );
    });

    it('changes of state at the speed of the scale, like the rest of the chrome', () => {
        row({});

        expect(screen.getByRole('option', { name: 'gateway' })).toHaveClass('transition-colors');
    });

    /**
     * The inset of a row with a level is said once, in `runtime.css`, from the level it carries:
     * a padding utility on the start edge would sit above that rule and the row would never
     * step in, so the start padding only exists when there is no level to read.
     */
    it('leaves the start inset to the level rule, and pads only the flat row', () => {
        row({});

        expect(screen.getByRole('option', { name: 'gateway' })).toHaveClass('ps-pad-control');
        expect(screen.getByRole('option', { name: 'gateway' })).not.toHaveAttribute('data-level');

        cleanup();

        row({ level: 1 });

        const leveled = screen.getByRole('option', { name: 'gateway' });

        expect(leveled).toHaveAttribute('data-level', '1');
        expect(leveled).not.toHaveClass('ps-pad-control');
    });

    it('stands two lines tall with the air of a row when it is a pair', () => {
        row({ density: 'pair' });

        const pair = screen.getByRole('option', { name: 'gateway' });

        expect(pair).toHaveClass('h-row-pair', 'gap-gap-icon-text', 'pe-pad-control');
        expect(pair).not.toHaveClass('h-row');
    });
});

describe('a row asked for from outside the list', () => {
    it('takes the focus and says it is shown', () => {
        const onRevealed = vi.fn();

        render(
            <ListRow onRevealed={onRevealed} onSelect={vi.fn()} revealed selected={false}>
                <RowLabel>gateway</RowLabel>
            </ListRow>,
        );

        expect(screen.getByRole('option', { name: 'gateway' })).toHaveFocus();
        expect(onRevealed).toHaveBeenCalledTimes(1);
        cleanup();
    });
});
