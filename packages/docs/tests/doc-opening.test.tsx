import { leavesOf, ROOT_GROUP_ID, success } from '@mandor/ipc';
import { bridge, selectTabs, shellStore } from '@mandor/shell';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WorkspaceDocs } from '../src/index.js';
import { DocsSidebar } from '../src/components/sidebar/DocsSidebar.js';
import { docsStore } from '../src/docs-store.js';

import { AppProviders } from './support/app-providers.js';

const README = 'mandor://local-apis/events/doc/readme.md';

async function renderListed(): Promise<HTMLElement> {
    render(
        <>
            <WorkspaceDocs />
            <DocsSidebar />
        </>,
        { wrapper: AppProviders },
    );

    return screen.findByRole('option', { name: 'readme' });
}

beforeEach(() => {
    vi.restoreAllMocks();
    docsStore.getState().reset();
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local APIs', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });
    vi.spyOn(bridge.doc, 'list').mockResolvedValue(
        success([
            { name: 'notas.md', title: 'notas' },
            { name: 'readme.md', title: 'readme' },
        ]),
    );
});

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();

    // The window schedules a session save on every change; nothing here waits 250 ms for it.
    shellStore.getState().reset();
});

describe('opening a doc from the list', () => {
    it('opens one tab per file kept with a double click', async () => {
        fireEvent.click(await renderListed(), { detail: 2 });
        fireEvent.click(screen.getByRole('option', { name: 'notas' }), { detail: 2 });

        expect(selectTabs(shellStore.getState()).map((tab) => tab.resource)).toEqual([
            README,
            'mandor://local-apis/events/doc/notas.md',
        ]);
    });

    /** A single click only looks: the next look takes the same tab, as in an editor. */
    it('looks at a doc with a single click, in the one tab the next look replaces', async () => {
        fireEvent.click(await renderListed(), { detail: 1 });
        fireEvent.click(screen.getByRole('option', { name: 'notas' }), { detail: 1 });

        const tabs = selectTabs(shellStore.getState());

        expect(tabs.map((tab) => tab.resource)).toEqual([
            'mandor://local-apis/events/doc/notas.md',
        ]);
        expect(tabs[0]?.preview).toBe(true);
    });

    it('keeps the doc it is only looking at when the row is opened again with Enter', async () => {
        const row = await renderListed();

        fireEvent.click(row, { detail: 1 });
        fireEvent.keyDown(row, { key: 'Enter' });

        expect(selectTabs(shellStore.getState())[0]?.preview).toBeUndefined();
    });

    /**
     * A file is one tab. The same doc twice is the same text with two places in it, and the
     * reader who closes the wrong one loses the place they were at in a file they still have
     * open. Reading a doc beside what it describes is the split, not a second copy of the doc.
     */
    it('brings the tab a doc already has forward instead of opening a second one', async () => {
        const row = await renderListed();

        fireEvent.click(row);

        const beside = shellStore.getState().splitGroup(ROOT_GROUP_ID, 'row');

        shellStore.getState().focusGroup(beside);
        fireEvent.click(row);

        const state = shellStore.getState();

        expect(leavesOf(state.grid).map((leaf) => leaf.tabs.length)).toEqual([1, 0]);
        expect(state.resources[README]?.tabs).toHaveLength(1);
        expect(state.activeGroupId).toBe(ROOT_GROUP_ID);
    });

    it('opens it in the group beside when the row is taken with a modifier', async () => {
        fireEvent.click(await renderListed(), { altKey: true });

        const state = shellStore.getState();

        expect(leavesOf(state.grid)).toHaveLength(2);
        expect(leavesOf(state.grid)[0]?.tabs).toEqual([]);
    });
});
