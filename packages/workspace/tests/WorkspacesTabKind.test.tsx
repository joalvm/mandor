import { MessagesProvider } from '@mandor/i18n';
import { ROOT_GROUP_ID } from '@mandor/ipc';
import {
    selectActiveTabId,
    selectGroupOfTab,
    selectTabs,
    shellStore,
    tabKind,
    tabKindOf,
    windowSurface,
} from '@mandor/shell';
import { DrawnTabPart, translatorIn } from '@mandor/shell/testing/tab-kind';
import { ToastProvider } from '@mandor/ui';
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WorkspacesTabKind, workspacesStore } from '../src/index.js';
import { openWorkspacesTab, WORKSPACES_TAB_KIND } from '../src/open-workspaces-tab.js';

const ORIGIN = 'local';
const OTHER = { id: 'other', kind: 'doc', resource: 'mandor://local/events/doc/one.md' };
const WORKSPACE = 'events';

let unregister: () => void = () => undefined;

function Wrapper({ children }: { children: ReactNode }) {
    return (
        <MessagesProvider preferences={{ language: 'en' }}>
            <ToastProvider messages={{ close: 'Close', more: (count) => `${String(count)} more` }}>
                {children}
            </ToastProvider>
        </MessagesProvider>
    );
}

beforeEach(() => {
    vi.restoreAllMocks();
    shellStore.getState().reset();
    workspacesStore.getState().reset();
    shellStore.setState({ activeOriginId: ORIGIN, activeWorkspaceId: WORKSPACE });
    unregister = render(<WorkspacesTabKind />).unmount;
});

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();

    unregister();
    shellStore.getState().reset();
});

describe('the workspaces tab kind', () => {
    it('opens the tab on the group in focus and reads it', () => {
        openWorkspacesTab();

        expect(selectTabs(shellStore.getState()).map((tab) => tab.kind)).toEqual([
            WORKSPACES_TAB_KIND,
        ]);
        expect(selectActiveTabId(shellStore.getState())).toBe(WORKSPACES_TAB_KIND);
    });

    /** One list of workspaces per window: asking again lifts the one open, never opens a second. */
    it('opens the tab once, however many times it is asked for', () => {
        openWorkspacesTab();
        openWorkspacesTab();

        expect(selectTabs(shellStore.getState())).toHaveLength(1);
    });

    /**
     * Half of the window is asking, and the list is open in the other half. The answer is to go
     * there: a tab is open once, so refusing to move the focus answers the reader with nothing.
     */
    it('goes to the tab when it is open in the other group of the window', () => {
        openWorkspacesTab();
        shellStore.getState().openTabAside(OTHER);
        openWorkspacesTab();

        expect(shellStore.getState().activeGroupId).toBe(ROOT_GROUP_ID);
        expect(selectActiveTabId(shellStore.getState())).toBe(WORKSPACES_TAB_KIND);
        expect(selectGroupOfTab(shellStore.getState(), WORKSPACES_TAB_KIND)).toBe(ROOT_GROUP_ID);
    });

    /**
     * The tab belongs to the window and not to what is loaded in it, so its resource names
     * neither the origin nor the workspace: switching either one leaves the tab where it was.
     */
    it('opens on a resource of the window, owned by no origin and no workspace', () => {
        openWorkspacesTab();

        const [tab] = selectTabs(shellStore.getState());

        expect(tab?.resource).not.toContain(ORIGIN);
        expect(tab?.resource).not.toContain(WORKSPACE);
    });

    it('titles the tab with the heading of the panel it shows', () => {
        expect(
            tabKindOf(WORKSPACES_TAB_KIND).title('mandor://_app/workspaces', translatorIn()),
        ).toBe('Workspaces');
    });

    /** It is a tab like any other, and a tab the reader cannot close is a tab that traps them. */
    it('leaves the tab closable', () => {
        expect(tabKindOf(WORKSPACES_TAB_KIND).closable).toBe(true);
    });

    it('shows the list of workspaces as the body of the tab', () => {
        render(
            <DrawnTabPart
                kind={WORKSPACES_TAB_KIND}
                resource="mandor://_app/workspaces"
                tabId="workspaces"
            />,
            {
                wrapper: Wrapper,
            },
        );

        expect(screen.getByRole('heading', { level: 1, name: 'Workspaces' })).toBeVisible();
    });

    it('answers as a surface, so a command sends the reader here without knowing it is a tab', () => {
        windowSurface(WORKSPACES_TAB_KIND)?.open(shellStore.getState());

        expect(selectTabs(shellStore.getState())).toHaveLength(1);
    });

    it('leaves the window when the app gives the kind back', () => {
        unregister();

        expect(tabKind(WORKSPACES_TAB_KIND)).toBeUndefined();
        expect(windowSurface(WORKSPACES_TAB_KIND)).toBeUndefined();
    });
});
