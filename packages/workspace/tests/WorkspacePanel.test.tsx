import { MessagesProvider } from '@mandor/i18n';
import { bridge, shellStore } from '@mandor/shell';
import { ToastProvider, TooltipProvider } from '@mandor/ui';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WorkspacePanel, workspacesStore } from '../src/index.js';

const ORIGIN = 'local';

function Wrapper({ children }: { children: ReactNode }) {
    return (
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>
                <ToastProvider
                    messages={{ close: 'Close', more: (count) => `${String(count)} more` }}
                >
                    {children}
                </ToastProvider>
            </TooltipProvider>
        </MessagesProvider>
    );
}

function typeName(value: string): void {
    const name = screen.getByRole('textbox', { name: 'Workspace name' });

    name.textContent = value;
    fireEvent.input(name);
}

/** The first of the buttons that share a name — the panel and its empty state offer the same doors. */
function firstButton(name: string): HTMLElement {
    const [button] = screen.getAllByRole('button', { name });

    expect(button).toBeDefined();

    if (button === undefined) {
        throw new Error(`no button answers to ${name}`);
    }

    return button;
}

function openFirstRowMenu(): void {
    fireEvent.pointerDown(firstButton('Workspace options'), {
        button: 0,
        ctrlKey: false,
        pointerType: 'mouse',
    });
}

beforeEach(() => {
    vi.restoreAllMocks();
    shellStore.getState().reset();
    workspacesStore.getState().reset();
});

describe('the workspace panel', () => {
    it('lists the workspaces of the active origin in its table', () => {
        shellStore.setState({ activeOriginId: ORIGIN });
        workspacesStore
            .getState()
            .setWorkspaces([{ id: 'events', kind: 'async', name: 'Events', modifiedAt: null }]);

        render(<WorkspacePanel />, { wrapper: Wrapper });

        expect(screen.getByRole('cell', { name: 'Events' })).toBeVisible();
    });

    /** While one origin is being swapped for another there is none, and these are not ours. */
    it('offers the empty state while no origin is active', () => {
        workspacesStore
            .getState()
            .setWorkspaces([{ id: 'events', kind: 'async', name: 'Events', modifiedAt: null }]);

        render(<WorkspacePanel />, { wrapper: Wrapper });

        expect(screen.getByText('No workspaces')).toBeVisible();
        expect(screen.queryByRole('cell', { name: 'Events' })).toBeNull();
    });

    it('creates a workspace from the dialog and makes it the open one', async () => {
        const create = vi.spyOn(bridge.workspace, 'create');

        shellStore.setState({ activeOriginId: ORIGIN });
        render(<WorkspacePanel />, { wrapper: Wrapper });
        // The empty state offers the same door; the one in the band comes first.
        fireEvent.click(firstButton('New workspace'));
        typeName('Events');
        fireEvent.click(screen.getByRole('button', { name: 'Create' }));

        await waitFor(() => {
            expect(create).toHaveBeenCalledWith({ name: 'Events' });
        });
        expect(workspacesStore.getState().workspaces).toEqual([
            expect.objectContaining({ id: 'events', name: 'Events' }),
        ]);
        expect(shellStore.getState().activeWorkspaceId).toBe('events');
    });

    /** Without an origin there is nowhere to write, so the way in waits for one. */
    it('cannot open the creation dialog with no origin active', () => {
        render(<WorkspacePanel />, { wrapper: Wrapper });

        for (const button of screen.getAllByRole('button', { name: 'New workspace' })) {
            expect(button).toBeDisabled();
        }
    });
});

describe('renaming from the workspace panel', () => {
    it('renames in place through the menu of the row', async () => {
        const rename = vi.spyOn(bridge.workspace, 'rename');

        shellStore.setState({ activeOriginId: ORIGIN });
        workspacesStore
            .getState()
            .setWorkspaces([{ id: 'events', kind: 'async', name: 'Events', modifiedAt: null }]);
        render(<WorkspacePanel />, { wrapper: Wrapper });

        fireEvent.pointerDown(screen.getByRole('button', { name: 'Workspace options' }), {
            button: 0,
            ctrlKey: false,
            pointerType: 'mouse',
        });
        fireEvent.click(screen.getByRole('menuitem', { name: 'Rename' }));

        const field = screen.getByRole('textbox', { name: 'Workspace name' });

        field.textContent = 'Orders';
        fireEvent.input(field);
        fireEvent.keyDown(field, { key: 'Enter' });

        await waitFor(() => {
            expect(rename).toHaveBeenCalledWith({ id: 'events', name: 'Orders' });
        });
    });
});

describe('deleting from the workspace panel', () => {
    it('deletes the one that is open and moves the window to the next', async () => {
        shellStore.setState({ activeOriginId: ORIGIN });
        shellStore.getState().setActiveWorkspace('orders');
        workspacesStore.getState().setWorkspaces([
            { id: 'orders', kind: 'async', name: 'Orders', modifiedAt: null },
            { id: 'events', kind: 'async', name: 'Events', modifiedAt: null },
        ]);
        render(<WorkspacePanel />, { wrapper: Wrapper });

        openFirstRowMenu();
        fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));

        const question = await screen.findByRole('alertdialog', { name: 'Delete Orders?' });

        fireEvent.click(within(question).getByRole('button', { name: 'Delete' }));

        await waitFor(() => {
            expect(shellStore.getState().activeWorkspaceId).toBe('events');
        });
    });

    it('asks by name and removes the workspace when confirmed', async () => {
        const remove = vi.spyOn(bridge.workspace, 'delete');

        shellStore.setState({ activeOriginId: ORIGIN });
        shellStore.getState().setActiveWorkspace('events');
        workspacesStore.getState().setWorkspaces([
            { id: 'orders', kind: 'async', name: 'Orders', modifiedAt: null },
            { id: 'events', kind: 'async', name: 'Events', modifiedAt: null },
        ]);
        render(<WorkspacePanel />, { wrapper: Wrapper });

        openFirstRowMenu();
        fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));

        const question = await screen.findByRole('alertdialog', { name: 'Delete Orders?' });

        expect(question).toBeVisible();
        fireEvent.click(within(question).getByRole('button', { name: 'Delete' }));

        await waitFor(() => {
            expect(remove).toHaveBeenCalledWith({ id: 'orders' });
        });
        await waitFor(() => {
            expect(workspacesStore.getState().workspaces.map((each) => each.id)).toEqual([
                'events',
            ]);
        });
    });
});
