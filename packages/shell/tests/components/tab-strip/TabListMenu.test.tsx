import { MessagesProvider } from '@mandor/i18n';
import { ROOT_GROUP_ID } from '@mandor/ipc';
import { TooltipProvider } from '@mandor/ui';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { DockviewGroupPanel } from 'dockview';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TAB_WALK_COMMANDS } from '../../../src/command/tab-walk-commands.js';
import { TabListMenu } from '../../../src/components/tab-strip/TabListMenu.js';
import { GroupGridContext } from '../../../src/grid/group-grid-scope.js';
import { shellStore, type Tab } from '../../../src/index.js';
import { declareTabKindSpec } from '../../../src/testing/tab-kind.js';

const TITLES: Record<string, string> = { login: 'Login flow', orders: 'Orders', users: 'Users' };

function doc(id: string): Tab {
    return { id, kind: 'listed', resource: `mandor://demo/payments/doc/${id}.md` };
}

/** What the list was asked to close, the way the grid hears it. */
const closed = vi.fn<(groupId: string, tabId: string) => void>();

let undo: () => void = () => undefined;

function draw(): void {
    render(
        <MessagesProvider preferences={{ language: 'es' }}>
            <TooltipProvider>
                <GroupGridContext value={{ onCloseTab: closed, resources: {} }}>
                    <TabListMenu group={{ id: ROOT_GROUP_ID } as DockviewGroupPanel} />
                </GroupGridContext>
            </TooltipProvider>
        </MessagesProvider>,
    );
}

/** The list as it reads: one line per name, the sections named where they start. */
function lines(): string[] {
    const list = screen.getByRole('listbox', { name: 'Pestañas abiertas' });

    return within(list)
        .getAllByRole('option')
        .map((row) => row.textContent);
}

function openList(): void {
    fireEvent.click(screen.getByRole('button', { name: 'Pestañas abiertas' }));
}

function type(value: string): void {
    const field = screen.getByRole('searchbox', { name: 'Buscar pestañas' });

    field.textContent = value;
    fireEvent.input(field);
}

beforeEach(() => {
    undo = declareTabKindSpec({
        closable: true,
        icon: 'doc',
        id: 'listed',
        title: (resource) => TITLES[resource.split('/').pop()?.replace('.md', '') ?? ''] ?? '',
    });

    for (const id of ['orders', 'login', 'users']) {
        shellStore.getState().openTab(ROOT_GROUP_ID, doc(id));
        shellStore.getState().keepTab(id);
    }

    shellStore.getState().pinTab('users');
    shellStore.getState().closeTab(ROOT_GROUP_ID, 'orders');
});

afterEach(() => {
    cleanup();
    shellStore.getState().reset();
    closed.mockClear();
    undo();
});

/** `TabListMenu` opens `TabListPanel`, which draws a `TabListLine` per tab. */
describe('the list of tabs of a group', () => {
    it('lists the open tabs, the pinned on top, and what was closed lately under its name', () => {
        draw();
        openList();

        expect(lines()).toEqual(['Users', 'Login flow', 'Orders']);
        expect(screen.getByRole('group', { name: 'Cerradas recientemente' })).toHaveTextContent(
            'Orders',
        );
    });

    it('narrows by what is typed and brings back what the arrows reach, with Enter', () => {
        shellStore.getState().setActiveTab(ROOT_GROUP_ID, 'users');
        draw();
        openList();
        type('o');
        fireEvent.keyDown(screen.getByRole('searchbox'), { key: 'ArrowDown' });
        fireEvent.keyDown(screen.getByRole('searchbox'), { key: 'Enter' });

        expect(shellStore.getState().grid).toMatchObject({ activeTab: 'orders' });
        expect(screen.queryByRole('listbox')).toBeNull();
    });

    it('closes an open tab from its line without putting it in front', () => {
        draw();
        openList();

        const login = screen.getByRole('option', { name: 'Login flow' });

        fireEvent.click(within(login).getByRole('button', { name: 'Cerrar pestaña' }));

        expect(closed).toHaveBeenCalledWith(ROOT_GROUP_ID, 'login');
        expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    /** The keys open the list of the group that holds the focus, as the button would. */
    it('opens from the search of tabs, on the focused group', () => {
        draw();

        const search = TAB_WALK_COMMANDS.find((command) => command.id === 'tab.search');

        act(() => {
            search?.run(shellStore.getState());
        });

        expect(screen.getByRole('searchbox', { name: 'Buscar pestañas' })).toHaveFocus();
    });
});
