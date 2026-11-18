import { leavesOf, ROOT_GROUP_ID } from '@mandor/ipc';
import { openOriginsTab } from '@mandor/repos';
import { openWorkspacesTab } from '@mandor/workspace';
import {
    selectActiveTabId,
    selectTabs,
    shellStore,
    tabKind,
    useStatusItems,
    windowSurface,
} from '@mandor/shell';
import { act, render, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AsyncTabKinds } from '../../../src/renderer/app/AsyncTabKinds.js';
import { AppProviders } from '../support/app-providers.js';

vi.mock('../../../src/renderer/features/connections/index.js', () => ({
    ConnectionDefaultsSettings: () => null,
    ConnectionFolderVariables: () => null,
    ConnectionTabKind: () => null,
}));

beforeEach(() => {
    shellStore.getState().reset();
});

afterEach(() => {
    shellStore.getState().reset();
});

describe('the async tab kinds', () => {
    /**
     * Declaring a kind opens nothing. A window with no session shows an empty centre, which is
     * the truth; a tab put there to fill it would be a thing the user never asked to open.
     */
    it('registers its kinds without opening one of its own', () => {
        const unregister = render(<AsyncTabKinds />, { wrapper: AppProviders }).unmount;

        expect(selectTabs(shellStore.getState()).map((tab) => tab.kind)).not.toContain(
            'workspaces',
        );
        expect(tabKind('doc')).toBeDefined();
        expect(tabKind('conflict')).toBeDefined();
        expect(tabKind('workspaces')).toBeDefined();
        // The settings open as a dialog over the window, never as a tab of it.
        expect(tabKind('settings')).toBeUndefined();
        expect(windowSurface('settings')).toBeDefined();

        unregister();
    });

    /**
     * A window that comes back split left the focus somewhere. Whatever the registry opens for
     * itself goes in behind that, never in front of the tab the user was reading.
     */
    it('leaves a restored window alone when the focus came back in another group', () => {
        const restored = shellStore.getState();

        restored.openTab(ROOT_GROUP_ID, { id: 'alpha', kind: 'text', resource: 'mandor://alpha' });

        const aside = restored.splitGroup(ROOT_GROUP_ID, 'row');

        shellStore.getState().openTab(aside, { id: 'beta', kind: 'text', resource: 'mandor://b' });

        const unregister = render(<AsyncTabKinds />, { wrapper: AppProviders }).unmount;
        const state = shellStore.getState();

        expect(state.activeGroupId).toBe(aside);
        expect(selectActiveTabId(state)).toBe('beta');
        const root = leavesOf(state.grid).find((leaf) => leaf.id === ROOT_GROUP_ID);

        expect(root?.activeTab).toBe('alpha');

        unregister();
    });

    /** What the window says about the updates is shared, so both apps hang it the same way. */
    it('hangs the update in the status line, and takes it down with the rest', () => {
        const stop = render(<AsyncTabKinds />, { wrapper: AppProviders }).unmount;
        const items = renderHook(() => useStatusItems());

        expect(items.result.current.map((item) => item.id)).toContain('update');

        act(() => {
            stop();
        });

        expect(items.result.current.map((item) => item.id)).not.toContain('update');
    });

    it('opens the workspaces tab once and lifts it on a second ask', () => {
        const unregister = render(<AsyncTabKinds />, { wrapper: AppProviders }).unmount;

        openWorkspacesTab();
        openWorkspacesTab();

        const state = shellStore.getState();

        expect(selectTabs(state).filter((tab) => tab.id === 'workspaces')).toHaveLength(1);
        expect(selectActiveTabId(state)).toBe('workspaces');

        unregister();
    });

    it('opens the origins tab once and lifts it on a second ask', () => {
        const unregister = render(<AsyncTabKinds />, { wrapper: AppProviders }).unmount;

        openOriginsTab();
        openOriginsTab();

        const state = shellStore.getState();

        expect(selectTabs(state).filter((tab) => tab.id === 'origins')).toHaveLength(1);
        expect(selectActiveTabId(state)).toBe('origins');

        unregister();
    });
});
