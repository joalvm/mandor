import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DialogNavItem } from '../../../src/components/dialog/DialogNavItem.js';
import { DialogNavList } from '../../../src/components/dialog/DialogNavList.js';

const COLUMN = ['General', 'Cabeceras', 'Reintento'] as const;

function drawColumn(open: (typeof COLUMN)[number]) {
    const onSelect = vi.fn();

    render(
        <DialogNavList label="Secciones">
            {COLUMN.map((label) => (
                <DialogNavItem
                    icon="headers"
                    key={label}
                    label={label}
                    onSelect={onSelect}
                    selected={label === open}
                />
            ))}
        </DialogNavList>,
    );

    return onSelect;
}

describe('the list of sections of a dialog', () => {
    it('is announced as a list named by its label', () => {
        drawColumn('General');

        expect(screen.getByRole('listbox', { name: 'Secciones' })).toBeVisible();
        expect(screen.getAllByRole('option')).toHaveLength(3);
    });

    it('walks its sections with the arrows, Home and End, without leaving them', () => {
        drawColumn('General');

        const first = screen.getByRole('option', { name: 'General' });
        const second = screen.getByRole('option', { name: 'Cabeceras' });
        const last = screen.getByRole('option', { name: 'Reintento' });

        first.focus();
        fireEvent.keyDown(first, { key: 'ArrowDown' });

        expect(second).toHaveFocus();

        fireEvent.keyDown(second, { key: 'End' });

        expect(last).toHaveFocus();

        fireEvent.keyDown(last, { key: 'ArrowDown' });

        expect(last).toHaveFocus();

        fireEvent.keyDown(last, { key: 'Home' });

        expect(first).toHaveFocus();

        fireEvent.keyDown(first, { key: 'ArrowUp' });

        expect(first).toHaveFocus();
    });

    /** Selection and focus are two things: walking the list opens nothing. */
    it('moves the focus and leaves the open section where it was', () => {
        const onSelect = drawColumn('General');
        const first = screen.getByRole('option', { name: 'General' });

        first.focus();
        fireEvent.keyDown(first, { key: 'ArrowDown' });

        expect(onSelect).not.toHaveBeenCalled();
        expect(first).toHaveAttribute('aria-selected', 'true');
    });
});
