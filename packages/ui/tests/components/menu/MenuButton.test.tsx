import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Menu } from '../../../src/components/menu/Menu.js';
import { MenuButton } from '../../../src/components/menu/MenuButton.js';
import { MenuContent } from '../../../src/components/menu/MenuContent.js';
import { MenuItem } from '../../../src/components/menu/MenuItem.js';

/** Radix opens the menu on pointerdown of its trigger, and runs the line on click. */
function openFrom(label: string): void {
    fireEvent.pointerDown(screen.getByRole('button', { name: label }), {
        button: 0,
        ctrlKey: false,
    });
}

describe('the named button a menu hangs from', () => {
    it('opens its lines as a menu from the name it is found by', async () => {
        const onSelect = vi.fn();

        render(
            <Menu>
                <MenuButton icon="origin-local" label="Origen" />
                <MenuContent>
                    <MenuItem onSelect={onSelect}>Recargar</MenuItem>
                </MenuContent>
            </Menu>,
        );

        openFrom('Origen');

        const item = await screen.findByRole('menuitem', { name: 'Recargar' });

        expect(item).toBeVisible();

        fireEvent.click(item);

        expect(onSelect).toHaveBeenCalledOnce();
    });

    it('announces itself as the trigger of a menu', () => {
        render(
            <Menu>
                <MenuButton icon="origin-local" label="Origen" />
                <MenuContent>
                    <MenuItem onSelect={vi.fn()}>Recargar</MenuItem>
                </MenuContent>
            </Menu>,
        );

        expect(screen.getByRole('button', { name: 'Origen' })).toHaveAttribute(
            'aria-haspopup',
            'menu',
        );
    });

    it('says what it opens with its glyph, its name and the chevron, in that order', () => {
        render(
            <Menu>
                <MenuButton icon="origin-local" label="Origen" />
                <MenuContent>
                    <MenuItem onSelect={vi.fn()}>Recargar</MenuItem>
                </MenuContent>
            </Menu>,
        );

        const button = screen.getByRole('button', { name: 'Origen' });
        const contents = button.firstElementChild;

        if (contents === null) {
            throw new Error('the button never took its contents');
        }

        const [glyph, name, chevron] = [...contents.children];

        expect(button.textContent).toBe('Origen');
        expect(glyph).toHaveAttribute('aria-hidden', 'true');
        expect(glyph?.querySelector('svg')).not.toBeNull();
        expect(name).toHaveTextContent('Origen');
        expect(chevron?.tagName).toBe('svg');
    });

    /**
     * The host resolves the colour of the glyph in the stylesheet, never in a prop, so it has to
     * land on the element the selector reads.
     */
    it('hands the host its glyph hangs from to the stylesheet', () => {
        render(
            <Menu>
                <MenuButton host="sidebar" icon="origin-local" label="Origen" />
                <MenuContent>
                    <MenuItem onSelect={vi.fn()}>Recargar</MenuItem>
                </MenuContent>
            </Menu>,
        );

        const button = screen.getByRole('button', { name: 'Origen' });
        const host = button.querySelector('[data-host]');

        expect(host).not.toBeNull();
        expect(host).toHaveAttribute('data-host', 'sidebar');
    });

    /** The tone is the stylesheet's to paint, as a dot on the glyph; the button only names it. */
    it('hands the tone of what it names to its glyph, and none when it has none', () => {
        render(
            <Menu>
                <MenuButton icon="origin-remote" label="Equipo" tone="error" />
                <MenuButton icon="origin-local" label="Local" />
                <MenuContent>
                    <MenuItem onSelect={vi.fn()}>Recargar</MenuItem>
                </MenuContent>
            </Menu>,
        );

        const [remote, local] = document.querySelectorAll('[data-part="menu-button-glyph"]');

        expect(remote).toHaveAttribute('data-tone', 'error');
        expect(local).not.toHaveAttribute('data-tone');
    });
});
