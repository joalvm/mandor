import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
    Button,
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
    Menu,
    MenuContent,
    MenuItem,
    MenuShortcut,
    MenuTrigger,
} from '../../src/index.js';
import { byPart } from '../../src/testing/by-part.js';

/** Radix opens the menu on pointerdown of its trigger, and runs the line on click. */
function openFrom(label: string): void {
    fireEvent.pointerDown(screen.getByRole('button', { name: label }), {
        button: 0,
        ctrlKey: false,
    });
}

/** The check is the one glyph a menu draws, and only where the menu said it takes checks. */
describe('a menu written as a tree of parts', () => {
    it('opens menu items by role', async () => {
        const onSelect = vi.fn();

        render(
            <Menu>
                <MenuTrigger>
                    <Button>Opciones</Button>
                </MenuTrigger>
                <MenuContent>
                    <MenuItem onSelect={onSelect}>Renombrar</MenuItem>
                </MenuContent>
            </Menu>,
        );

        openFrom('Opciones');

        const item = await screen.findByRole('menuitem', { name: 'Renombrar' });

        expect(item).toBeVisible();
        fireEvent.click(item);
        expect(onSelect).toHaveBeenCalledOnce();
    });

    it('keeps the check out of a menu that did not say it takes checks', async () => {
        render(
            <Menu>
                <MenuTrigger>
                    <Button>Opciones</Button>
                </MenuTrigger>
                <MenuContent>
                    <MenuItem checked onSelect={vi.fn()}>
                        Renombrar
                    </MenuItem>
                </MenuContent>
            </Menu>,
        );

        openFrom('Opciones');

        const item = await screen.findByRole('menuitem', { name: 'Renombrar' });

        expect(item.querySelector('svg')).toBeNull();
    });

    it('marks the checked line of a checkable menu with weight, not a glyph', async () => {
        render(
            <Menu checkable>
                <MenuTrigger>
                    <Button>Opciones</Button>
                </MenuTrigger>
                <MenuContent>
                    <MenuItem checked onSelect={vi.fn()}>
                        Renombrar
                    </MenuItem>
                    <MenuItem onSelect={vi.fn()}>Duplicar</MenuItem>
                </MenuContent>
            </Menu>,
        );

        openFrom('Opciones');

        const checked = await screen.findByRole('menuitem', { name: 'Renombrar' });
        const unchecked = screen.getByRole('menuitem', { name: 'Duplicar' });

        expect(checked).toHaveClass('font-semibold');
        expect(checked.querySelector('svg')).toBeNull();
        expect(unchecked).not.toHaveClass('font-semibold');
    });

    /** The width itself is the stylesheet's: it reads the trigger's measure from the library. */
    it('asks to be as wide as its trigger only when told to', async () => {
        render(
            <Menu>
                <MenuTrigger>
                    <Button>Formato</Button>
                </MenuTrigger>
                <MenuContent fitTrigger>
                    <MenuItem onSelect={vi.fn()}>OpenAPI</MenuItem>
                </MenuContent>
            </Menu>,
        );

        openFrom('Formato');

        await screen.findByRole('menuitem', { name: 'OpenAPI' });

        expect(byPart('menu-content')).toHaveAttribute('data-fit-trigger', '');
    });

    it('opens context menu items over the surface it wraps', async () => {
        const onSelect = vi.fn<(command: string) => void>();

        render(
            <ContextMenu>
                <ContextMenuTrigger>
                    <div tabIndex={0}>Superficie editable</div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                    <ContextMenuItem
                        onSelect={() => {
                            onSelect('copy');
                        }}
                    >
                        Copiar
                        <MenuShortcut>Ctrl+C</MenuShortcut>
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                        disabled
                        onSelect={() => {
                            onSelect('paste');
                        }}
                    >
                        Pegar
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>,
        );

        fireEvent.contextMenu(screen.getByText('Superficie editable'));

        const item = await screen.findByRole('menuitem', { name: /Copiar/ });

        expect(item).toBeVisible();
        expect(item).toHaveClass('h-row-xs', 'text-xs');
        expect(item).not.toHaveClass('h-row');
        expect(item).not.toHaveClass('text-sm');
        fireEvent.click(item);
        expect(onSelect).toHaveBeenCalledWith('copy');
    });
});
