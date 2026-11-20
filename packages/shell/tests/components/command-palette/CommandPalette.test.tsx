import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MessagesProvider } from '@mandor/i18n';
import { TooltipProvider } from '@mandor/ui';
import { rowName } from '@mandor/ui/testing';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CommandPalette, registerCommand, shellStore, windowSurface } from '../../../src/index.js';
import { PALETTE_SURFACE } from '../../../src/command/window-commands.js';

const UNREGISTER: (() => void)[] = [];
const RAN: string[] = [];

const SIX = [
    ['group.splitRight', 'commands:splitRight', 'commands:categoryGroup'],
    ['group.splitDown', 'commands:splitDown', 'commands:categoryGroup'],
    ['group.close', 'commands:closeGroup', 'commands:categoryGroup'],
    ['group.toggleMaximized', 'commands:toggleMaximized', 'commands:categoryGroup'],
    ['tab.close', 'commands:closeTab', 'commands:categoryTab'],
    ['tab.moveAside', 'commands:moveTabAside', 'commands:categoryTab'],
] as const;

function Wrapper({ children }: { children: ReactNode }) {
    return (
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>{children}</TooltipProvider>
        </MessagesProvider>
    );
}

/**
 * The palette is opened from somewhere, so the test keeps a real element to come back to. The
 * window reaches it the way a command does: through the surface the palette answers for.
 */
function Harness() {
    return (
        <>
            <button
                onClick={() => {
                    windowSurface(PALETTE_SURFACE)?.open(shellStore.getState());
                }}
                type="button"
            >
                Origin
            </button>
            <CommandPalette />
        </>
    );
}

function openPalette(): HTMLElement {
    const origin = screen.getByRole('button', { name: 'Origin' });

    origin.focus();
    fireEvent.click(origin);

    return origin;
}

function type(value: string): void {
    const field = screen.getByRole('textbox', { name: 'Search commands' });

    field.textContent = value;
    fireEvent.input(field);
}

function press(key: string): void {
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Search commands' }), { key });
}

/** A command is named by the label of its row: an option that carries a shortcut says both. */
function optionNames(): string[] {
    return screen.getAllByRole('option').map(rowName);
}

function highlighted(): string {
    const option = screen.getAllByRole('option').find((each) => each.ariaSelected === 'true');

    return option === undefined ? '' : rowName(option);
}

function optionNamed(name: string): HTMLElement | undefined {
    return screen.getAllByRole('option').find((each) => rowName(each) === name);
}

beforeEach(() => {
    shellStore.getState().reset();
    RAN.length = 0;

    for (const [id, title, category] of SIX) {
        UNREGISTER.push(
            registerCommand({
                category,
                icon: 'doc',
                id,
                run: () => {
                    RAN.push(id);
                },
                title,
            }),
        );
    }
});

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();

    for (const unregister of UNREGISTER.splice(0)) {
        unregister();
    }
});

describe('the command palette', () => {
    it('leaves only the commands that match what was typed', () => {
        render(<Harness />, { wrapper: Wrapper });
        openPalette();

        expect(optionNames()).toHaveLength(SIX.length);

        type('spl');

        expect(optionNames()).toEqual(['Split group right', 'Split group down']);
    });

    it('runs the highlighted command when it is chosen', () => {
        render(<Harness />, { wrapper: Wrapper });
        openPalette();
        type('spl');
        press('ArrowDown');

        expect(highlighted()).toBe('Split group down');

        press('Enter');

        expect(RAN).toEqual(['group.splitDown']);
    });

    it('gives the focus back to the element the palette was opened from', () => {
        render(<Harness />, { wrapper: Wrapper });

        const origin = openPalette();

        expect(document.activeElement).toBe(
            screen.getByRole('textbox', { name: 'Search commands' }),
        );

        press('Escape');

        expect(screen.queryByRole('listbox')).toBeNull();
        expect(document.activeElement).toBe(origin);
    });

    /**
     * A press anywhere outside it closes it, and so does `Escape` once the focus went elsewhere:
     * a palette that only the field inside it could close traps whoever clicked away.
     */
    it('closes on a press outside it and on Escape wherever the focus went', () => {
        render(<Harness />, { wrapper: Wrapper });
        openPalette();

        fireEvent.pointerDown(document.body);

        expect(screen.queryByRole('listbox')).toBeNull();

        openPalette();
        document.body.focus();
        fireEvent.keyDown(document.body, { key: 'Escape' });

        expect(screen.queryByRole('listbox')).toBeNull();
    });

    it('stays open on a press inside it', () => {
        render(<Harness />, { wrapper: Wrapper });
        openPalette();

        fireEvent.pointerDown(screen.getByRole('listbox', { name: 'Command palette' }));

        expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    /**
     * The focus never leaves the field, so a reader learns which row the arrows stand on from the
     * field itself: it points at the row that is selected, inside the list it controls.
     */
    it('points the field at the row the arrows stand on, and keeps the focus in the field', () => {
        render(<Harness />, { wrapper: Wrapper });
        openPalette();
        type('spl');

        const field = screen.getByRole('textbox', { name: 'Search commands' });
        const listbox = screen.getByRole('listbox', { name: 'Command palette' });

        expect(field).toHaveAttribute('aria-controls', listbox.id);
        expect(document.getElementById(field.getAttribute('aria-activedescendant') ?? '')).toBe(
            optionNamed('Split group right'),
        );

        press('ArrowDown');

        expect(document.getElementById(field.getAttribute('aria-activedescendant') ?? '')).toBe(
            optionNamed('Split group down'),
        );
        expect(document.activeElement).toBe(field);
    });

    it('points at no row when nothing matches', () => {
        render(<Harness />, { wrapper: Wrapper });
        openPalette();
        type('zzzz');

        expect(screen.getByRole('textbox', { name: 'Search commands' })).not.toHaveAttribute(
            'aria-activedescendant',
        );
    });

    it('keeps the rows out of the tabulator, because the field walks them', () => {
        render(<Harness />, { wrapper: Wrapper });
        openPalette();

        for (const option of screen.getAllByRole('option')) {
            expect(option).toHaveAttribute('tabindex', '-1');
        }
    });

    it('walks the whole list with the ends of the keyboard', () => {
        render(<Harness />, { wrapper: Wrapper });
        openPalette();
        press('End');

        expect(highlighted()).toBe('Move tab to the group beside');

        press('Home');

        expect(highlighted()).toBe('Split group right');

        press('ArrowUp');

        expect(highlighted()).toBe('Move tab to the group beside');
    });

    it('groups the commands under the part of the window they belong to', () => {
        render(<Harness />, { wrapper: Wrapper });
        openPalette();

        const tab = screen.getByRole('group', { name: 'Tab' });

        expect(within(tab).getAllByRole('option')).toHaveLength(2);
    });

    it('writes the shortcut beside the command that has one', () => {
        render(<Harness />, { wrapper: Wrapper });
        openPalette();

        expect(optionNamed('Close tab')?.textContent).toContain('Ctrl+W');
    });

    it('offers what was used last before the rest of its group', () => {
        render(<Harness />, { wrapper: Wrapper });
        openPalette();
        type('close t');
        press('Enter');

        expect(RAN).toEqual(['tab.close']);

        openPalette();

        expect(optionNames()[0]).toBe('Close tab');
    });
});
