import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
    HoverCard,
    HoverCardPanel,
    HoverCardTrigger,
    Menu,
    MenuButton,
    MenuContent,
    MenuItem,
    Popover,
    PopoverPanel,
    PopoverTrigger,
    Select,
    SuggestList,
    Tooltip,
    TooltipProvider,
} from '../../src/index.js';
import { byPart } from '../../src/testing/by-part.js';

/** What every layer that floats over the window wears: a faint edge and the round of a panel. */
const SOLID = ['rounded-panel', 'border', 'border-border-subtle', 'bg-surface-raised'];

/**
 * What every line a layer offers wears: the height of a control and its grey when taken. The
 * grey is the mark of the keyboard as well, so no ring of focus is drawn on top of it.
 */
const LINE = ['h-control', 'text-sm', 'outline-none', 'data-highlighted:bg-surface-selected'];

/**
 * Menus, popovers, hover cards, selects, suggestions and tooltips float over the window as one
 * kind of thing: a solid white panel with a faint edge, never the strong line of a control. The
 * lines they offer stand as tall as a control, and the one the keyboard is on turns grey.
 */
describe('the layers that float over the window', () => {
    it('draws a menu as a solid panel of lines as tall as a control', async () => {
        render(
            <Menu>
                <MenuButton icon="origin-local" label="Origen" />
                <MenuContent>
                    <MenuItem onSelect={vi.fn()}>Recargar</MenuItem>
                </MenuContent>
            </Menu>,
        );

        fireEvent.pointerDown(screen.getByRole('button', { name: 'Origen' }), { button: 0 });

        const item = await screen.findByRole('menuitem', { name: 'Recargar' });

        expect(byPart('menu-content')).toHaveClass(...SOLID);
        expect(item).toHaveClass(...LINE);
        expect(item).not.toHaveClass('h-row-xs', 'text-xs');
    });

    it('draws a context menu the same way', async () => {
        render(
            <ContextMenu>
                <ContextMenuTrigger>
                    <span>Superficie</span>
                </ContextMenuTrigger>
                <ContextMenuContent>
                    <ContextMenuItem onSelect={vi.fn()}>Copiar</ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>,
        );

        fireEvent.contextMenu(screen.getByText('Superficie'));

        const item = await screen.findByRole('menuitem', { name: 'Copiar' });

        expect(byPart('context-menu-content')).toHaveClass(...SOLID);
        expect(item).toHaveClass(...LINE);
    });

    it('draws a popover as a solid panel the sheet can find by its part', async () => {
        render(
            <Popover>
                <PopoverTrigger>
                    <button type="button">Crear</button>
                </PopoverTrigger>
                <PopoverPanel label="Crear workspace">
                    <span>Formulario</span>
                </PopoverPanel>
            </Popover>,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Crear' }));

        expect(await screen.findByRole('dialog', { name: 'Crear workspace' })).toBe(
            byPart('popover-panel'),
        );
        expect(byPart('popover-panel')).toHaveClass(...SOLID);
    });

    it('draws a hover card as a solid panel', async () => {
        render(
            <HoverCard>
                <HoverCardTrigger>
                    <button type="button">142 ms</button>
                </HoverCardTrigger>
                <HoverCardPanel>
                    <span>DNS lookup</span>
                </HoverCardPanel>
            </HoverCard>,
        );

        fireEvent.focus(screen.getByRole('button', { name: '142 ms' }));

        expect(await screen.findByText('DNS lookup')).toBeVisible();
        expect(byPart('hover-card-panel')).toHaveClass(...SOLID);
    });

    it('opens a select as a solid panel of lines as tall as a control', () => {
        render(
            <Select
                label="Transporte"
                onValueChange={vi.fn()}
                options={[
                    { label: 'WebSocket', value: 'ws' },
                    { label: 'Polling', value: 'polling' },
                ]}
                value="ws"
            />,
        );

        fireEvent.keyDown(screen.getByRole('combobox', { name: 'Transporte' }), {
            key: 'ArrowDown',
        });

        expect(byPart('select-content')).toHaveClass(...SOLID);
        expect(screen.getByRole('option', { name: 'Polling' })).toHaveClass(...LINE);
    });

    it('lists suggestions in a solid panel, each one as tall as a control', async () => {
        render(
            <Popover open>
                <SuggestList
                    activeName="host"
                    label="Variables del entorno"
                    onPick={vi.fn()}
                    options={[{ hint: '2', name: 'host' }]}
                />
            </Popover>,
        );

        const listbox = await screen.findByRole('listbox', { name: 'Variables del entorno' });

        expect(listbox).toHaveAttribute('data-part', 'suggest-list');
        // The list sets the size of the text; each option, its height.
        expect(listbox).toHaveClass(...SOLID, 'text-sm');
        expect(screen.getByRole('option', { name: /^host/ })).toHaveClass('h-control');
    });

    it('draws a tooltip with the faint edge and keeps its smaller round', async () => {
        render(
            <TooltipProvider delayDuration={0}>
                <Tooltip content="Buscar recursos">
                    <button type="button">Buscar</button>
                </Tooltip>
            </TooltipProvider>,
        );

        fireEvent.focus(screen.getByRole('button', { name: 'Buscar' }));
        await screen.findByRole('tooltip');

        expect(byPart('tooltip')).toHaveClass('rounded-md', 'border-border-subtle');
        expect(byPart('tooltip')).not.toHaveClass('border-border-strong');
    });
});
