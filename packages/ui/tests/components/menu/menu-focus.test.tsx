import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    Button,
    InlineNameInput,
    Menu,
    MenuContent,
    MenuItem,
    MenuTrigger,
} from '../../../src/index.js';

/** What the Rename line of a row does: the name gives way to a field that takes the focus. */
function RenamingMenu() {
    const [renaming, setRenaming] = useState(false);

    return (
        <>
            {renaming ? (
                <InlineNameInput
                    label="Nombre"
                    onCancel={vi.fn()}
                    onCommit={vi.fn(() => true)}
                    value="pedidos"
                />
            ) : null}
            <Menu>
                <MenuTrigger>
                    <Button>Opciones</Button>
                </MenuTrigger>
                <MenuContent>
                    <MenuItem
                        onSelect={() => {
                            setRenaming(true);
                        }}
                    >
                        Renombrar
                    </MenuItem>
                    <MenuItem onSelect={vi.fn()}>Duplicar</MenuItem>
                </MenuContent>
            </Menu>
        </>
    );
}

/** Radix opens the menu on pointerdown of its trigger. */
function open(): void {
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Opciones' }), {
        button: 0,
        ctrlKey: false,
    });
}

/** Chooses a line, and lets the menu finish closing: its focus goes back on a timer. */
async function choose(name: string): Promise<void> {
    const item = await screen.findByRole('menuitem', { name });

    vi.useFakeTimers();
    fireEvent.click(item);
    await act(() => vi.runAllTimersAsync());
}

afterEach(() => {
    vi.useRealTimers();
});

describe('where the focus goes once a line is chosen', () => {
    /** The field would lose the focus as it opened, and a field that loses it commits. */
    it('stays in the field the line opened, instead of going back to the trigger', async () => {
        render(<RenamingMenu />);
        open();
        await choose('Renombrar');

        expect(screen.getByRole('textbox', { name: 'Nombre' })).toHaveFocus();
    });

    it('goes back to the trigger when the line opened nothing that takes it', async () => {
        render(<RenamingMenu />);
        open();
        await choose('Duplicar');

        expect(screen.getByRole('button', { name: 'Opciones' })).toHaveFocus();
    });
});
