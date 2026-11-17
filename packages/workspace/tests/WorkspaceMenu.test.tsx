import { MessagesProvider } from '@mandor/i18n';
import { shellStore } from '@mandor/shell';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WorkspaceMenu, workspacesStore } from '../src/index.js';

const EVENTS = { id: 'events', kind: 'async', name: 'Events', modifiedAt: null } as const;
const ORDERS = { id: 'orders', kind: 'async', name: 'Orders', modifiedAt: null } as const;

function Wrapper({ children }: { children: ReactNode }) {
    return <MessagesProvider preferences={{ language: 'en' }}>{children}</MessagesProvider>;
}

function openMenu(): void {
    fireEvent.pointerDown(screen.getByRole('button', { name: /Events|No workspace/ }), {
        button: 0,
        ctrlKey: false,
        pointerType: 'mouse',
    });
}

beforeEach(() => {
    shellStore.getState().reset();
    workspacesStore.getState().reset();
});

describe('the workspace menu', () => {
    it('names the workspace the session left open', () => {
        workspacesStore.getState().setWorkspaces([EVENTS, ORDERS]);
        shellStore.getState().setActiveWorkspace('events');

        render(<WorkspaceMenu onManage={vi.fn()} />, { wrapper: Wrapper });

        expect(screen.getByRole('button', { name: /Events/ })).toBeVisible();
    });

    /** Starting with no repository is normal, so the control has to say so instead of blanking. */
    it('says so when no workspace is open', () => {
        render(<WorkspaceMenu onManage={vi.fn()} />, { wrapper: Wrapper });

        expect(screen.getByRole('button', { name: /No workspace/ })).toBeVisible();
    });

    it('switches the active workspace', () => {
        workspacesStore.getState().setWorkspaces([EVENTS, ORDERS]);
        shellStore.getState().setActiveWorkspace('events');

        render(<WorkspaceMenu onManage={vi.fn()} />, { wrapper: Wrapper });
        openMenu();
        fireEvent.click(screen.getByRole('menuitem', { name: 'Orders' }));

        expect(shellStore.getState().activeWorkspaceId).toBe('orders');
    });

    /** Administration is a tab, never a modal: the menu only asks the app to open it. */
    it('hands management to the application', () => {
        const onManage = vi.fn();

        render(<WorkspaceMenu onManage={onManage} />, { wrapper: Wrapper });
        openMenu();
        fireEvent.click(screen.getByRole('menuitem', { name: 'Manage workspaces' }));

        expect(onManage).toHaveBeenCalledTimes(1);
    });
});
