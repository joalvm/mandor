import { ROOT_GROUP_ID, success } from '@mandor/ipc';
import { bridge, shellStore, Sidebar } from '@mandor/shell';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DocsSection, WorkspaceDocs } from '../src/index.js';
import { docsStore } from '../src/docs-store.js';

import { AppProviders } from './support/app-providers.js';

beforeEach(() => {
    vi.restoreAllMocks();
    docsStore.getState().reset();
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local APIs', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });
    vi.spyOn(bridge.doc, 'list').mockResolvedValue(
        success([{ name: 'readme.md', title: 'readme' }]),
    );
});

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();

    shellStore.getState().reset();
});

describe('the section of the docs', () => {
    it('puts the notes of the workspace in the lateral while it is mounted', async () => {
        const view = render(
            <>
                <WorkspaceDocs />
                <DocsSection order={10} />
                <Sidebar />
            </>,
            { wrapper: AppProviders },
        );

        expect(screen.getByRole('button', { name: 'Docs' })).toHaveAttribute(
            'aria-expanded',
            'true',
        );
        expect(await screen.findByRole('option', { name: 'readme' })).toBeVisible();
        expect(screen.getByRole('button', { name: 'Docs' })).toHaveTextContent(/^Docs$/);

        view.rerender(
            <>
                <WorkspaceDocs />
                <Sidebar />
            </>,
        );

        expect(screen.queryByRole('button', { name: 'Docs' })).toBeNull();
    });
});

describe('a doc a tab asks the lateral to show', () => {
    it('hands its row the focus, then says it is shown', async () => {
        render(
            <>
                <WorkspaceDocs />
                <DocsSection order={10} />
                <Sidebar />
            </>,
            { wrapper: AppProviders },
        );

        const row = await screen.findByRole('option', { name: 'readme' });

        act(() => {
            shellStore.getState().setRevealing('mandor://local-apis/events/doc/readme.md');
        });

        expect(row).toHaveFocus();
        expect(shellStore.getState().revealing).toBeNull();
    });
});

describe('the doc of the tab in front', () => {
    /** As an explorer follows the editor in front: the row is marked, the focus stays put. */
    it('marks its row while its tab is in front, and only then', async () => {
        render(
            <>
                <WorkspaceDocs />
                <DocsSection order={10} />
                <Sidebar />
            </>,
            { wrapper: AppProviders },
        );

        const row = await screen.findByRole('option', { name: 'readme' });

        expect(row).toHaveAttribute('aria-selected', 'false');

        act(() => {
            shellStore.getState().openTab(ROOT_GROUP_ID, {
                id: 'readme',
                kind: 'doc',
                resource: 'mandor://local-apis/events/doc/readme.md',
            });
        });

        expect(row).toHaveAttribute('aria-selected', 'true');
        expect(row).not.toHaveFocus();

        act(() => {
            shellStore.getState().openTab(ROOT_GROUP_ID, {
                id: 'other',
                kind: 'doc',
                resource: 'mandor://local-apis/events/doc/other.md',
            });
        });

        expect(row).toHaveAttribute('aria-selected', 'false');

        act(() => {
            shellStore.getState().setActiveTab(ROOT_GROUP_ID, 'readme');
        });

        expect(row).toHaveAttribute('aria-selected', 'true');
    });
});
