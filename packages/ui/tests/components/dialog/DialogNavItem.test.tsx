import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DialogNavItem } from '../../../src/components/dialog/DialogNavItem.js';

const COLUMN = ['General', 'Cabeceras', 'Reintento'] as const;

function draw(selected = false) {
    const onSelect = vi.fn();

    render(
        <div aria-label="Secciones" role="listbox">
            <DialogNavItem
                icon="headers"
                label="Cabeceras"
                onSelect={onSelect}
                selected={selected}
            />
        </div>,
    );

    return onSelect;
}

function drawColumn(open: (typeof COLUMN)[number]) {
    render(
        <div aria-label="Secciones" role="listbox">
            {COLUMN.map((label) => (
                <DialogNavItem
                    icon="headers"
                    key={label}
                    label={label}
                    onSelect={vi.fn()}
                    selected={label === open}
                />
            ))}
        </div>,
    );
}

describe('a section in the column of a dialog', () => {
    it('is announced as an option named by its label, and says whether it is the one open', () => {
        draw(true);

        expect(screen.getByRole('option', { name: 'Cabeceras' })).toHaveAttribute(
            'aria-selected',
            'true',
        );
    });

    it('wears the grey of a selection in the window when it is the one open', () => {
        draw(true);

        expect(screen.getByRole('option', { name: 'Cabeceras' })).toHaveClass(
            'bg-surface-selected',
        );
    });

    it('says it is not open when another section is', () => {
        draw(false);

        expect(screen.getByRole('option', { name: 'Cabeceras' })).toHaveAttribute(
            'aria-selected',
            'false',
        );
    });

    it('opens its section from the pointer', () => {
        const onSelect = draw();

        fireEvent.click(screen.getByRole('option', { name: 'Cabeceras' }));

        expect(onSelect).toHaveBeenCalledTimes(1);
    });

    it('opens its section from Enter and space, and from no other key', () => {
        const onSelect = draw();
        const option = screen.getByRole('option', { name: 'Cabeceras' });

        fireEvent.keyDown(option, { key: 'Enter' });
        fireEvent.keyDown(option, { key: ' ' });
        fireEvent.keyDown(option, { key: 'a' });

        expect(onSelect).toHaveBeenCalledTimes(2);
    });

    /**
     * The tab key enters the list and leaves it; it does not walk it. Entering lands on the
     * section open, the way a list with one choice made receives the focus.
     */
    it('is the one stop of the tab order when it is open, and none when it is not', () => {
        drawColumn('General');

        expect(screen.getByRole('option', { name: 'General' })).toHaveAttribute('tabindex', '0');
        expect(screen.getByRole('option', { name: 'Cabeceras' })).toHaveAttribute('tabindex', '-1');
        expect(screen.getByRole('option', { name: 'Reintento' })).toHaveAttribute('tabindex', '-1');
    });

    /**
     * The reserved slot after the name carries a row action of the caller. Reaching it is not
     * opening the section: the button stops the click before the item hears it.
     */
    it('keeps the action of its nested content from opening the section', () => {
        const onSelect = vi.fn();
        const onRemove = vi.fn();

        render(
            <div aria-label="Secciones" role="listbox">
                <DialogNavItem icon="headers" label="Cabeceras" onSelect={onSelect} selected>
                    <button
                        aria-label="Quitar cabeceras"
                        onClick={(event) => {
                            event.stopPropagation();
                            onRemove();
                        }}
                        type="button"
                    >
                        Quitar
                    </button>
                </DialogNavItem>
            </div>,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Quitar cabeceras' }));

        expect(onRemove).toHaveBeenCalledTimes(1);
        expect(onSelect).not.toHaveBeenCalled();
        // The action of the nested content does not bleed into the name of the section.
        expect(screen.getByRole('option', { name: 'Cabeceras' })).toBeInTheDocument();
    });

    it('opens its section from the pointer with nested content in place', () => {
        const onSelect = vi.fn();

        render(
            <div aria-label="Secciones" role="listbox">
                <DialogNavItem icon="headers" label="Cabeceras" onSelect={onSelect} selected>
                    <span data-testid="slot" />
                </DialogNavItem>
            </div>,
        );

        fireEvent.click(screen.getByRole('option', { name: 'Cabeceras' }));

        expect(onSelect).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId('slot')).toBeInTheDocument();
    });
});
