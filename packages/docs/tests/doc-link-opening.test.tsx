import { leavesOf, success } from '@mandor/ipc';
import { bridge, selectTabs, shellStore, TabProvider } from '@mandor/shell';
import { declareTabKindSpec } from '@mandor/shell/testing/tab-kind';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DocPreviewTab } from '../src/components/tab/DocPreviewTab.js';
import { docsStore } from '../src/docs-store.js';

import { AppProviders } from './support/app-providers.js';

const README = 'mandor://local-apis/events/doc/readme.md';
const CONNECTION = 'mandor://local-apis/events/connection/ws-echo';
const ITEM = 'mandor://local-apis/events/item/pedidos/pedido-creado';

/** Renders the doc being read, with one link in it, and answers with the link. */
async function reading(uri: string): Promise<HTMLElement> {
    vi.spyOn(bridge.doc, 'read').mockResolvedValue(success(`[el recurso](${uri})\n`));
    render(
        <TabProvider value={{ resource: README, tabId: README }}>
            <DocPreviewTab />
        </TabProvider>,
        { wrapper: AppProviders },
    );

    return screen.findByRole('link', { name: 'el recurso' });
}

async function taking(uri: string, altKey = false): Promise<void> {
    const link = await reading(uri);

    // The open answers on a promise and speaks by toast; the click lands whole inside act.
    await act(() => {
        fireEvent.click(link, { altKey });

        return Promise.resolve();
    });
}

/** The kind an app that has connections registers: it answers which ones the workspace holds. */
function holdingConnections(): () => void {
    return declareTabKindSpec({
        closable: true,
        holds: (_workspaceId, path) => Promise.resolve(path === 'ws-echo'),
        icon: 'connection',
        id: 'connection',
        title: () => 'Ws echo',
    });
}

let release: () => void = () => undefined;

beforeEach(() => {
    vi.restoreAllMocks();
    shellStore.getState().reset();
    docsStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local APIs', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });
    vi.spyOn(bridge.doc, 'list').mockResolvedValue(
        success([{ name: 'readme.md', title: 'readme' }]),
    );
    release = holdingConnections();
});

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();

    release();
    // The window schedules a session save on every change; nothing here waits 250 ms for it.
    shellStore.getState().reset();
});

describe('following a link of a doc', () => {
    /** The doc is read while the thing it describes is being tried, so they end up side by side. */
    it('opens the resource in the group next door', async () => {
        await taking(CONNECTION);

        await waitFor(() => {
            expect(leavesOf(shellStore.getState().grid)).toHaveLength(2);
        });

        expect(leavesOf(shellStore.getState().grid)[1]?.tabs.map((tab) => tab.resource)).toEqual([
            CONNECTION,
        ]);
    });

    it('opens it where the reader already is when the link is taken with a modifier', async () => {
        await taking(CONNECTION, true);

        await waitFor(() => {
            expect(selectTabs(shellStore.getState()).map((tab) => tab.resource)).toEqual([
                CONNECTION,
            ]);
        });

        expect(leavesOf(shellStore.getState().grid)).toHaveLength(1);
    });

    /** A doc travels with the repository it was written in; what it names does not travel with it. */
    /** A doc describes the item it was written about, and the link is how the two stay together. */
    it('opens an item of the collection the link names', async () => {
        vi.spyOn(bridge.collections, 'tree').mockResolvedValue(
            success([
                {
                    kind: 'folder',
                    path: 'pedidos',
                    name: 'Pedidos',
                    children: [
                        {
                            kind: 'item',
                            path: 'pedidos/pedido-creado',
                            name: 'Pedido creado',
                            itemKind: 'message',
                            tags: [],
                        },
                    ],
                },
            ]),
        );

        await taking(ITEM, true);

        await waitFor(() => {
            expect(selectTabs(shellStore.getState()).map((tab) => tab.resource)).toEqual([ITEM]);
        });
    });

    /** A window with no kind that holds connections, as Sync's, has nothing such a link opens. */
    it('shows the URI of a connection when nothing in this window holds connections', async () => {
        release();
        await taking(CONNECTION);

        expect(await screen.findByText('Mandor found nothing at that link.')).toBeVisible();
        expect(selectTabs(shellStore.getState())).toEqual([]);
    });

    it('shows the URI of an item the collection no longer holds', async () => {
        await taking(ITEM);

        expect(await screen.findByText('Mandor found nothing at that link.')).toBeVisible();
        expect(selectTabs(shellStore.getState())).toEqual([]);
    });

    it('opens nothing and says why for a resource of another of the origins', async () => {
        await taking('mandor://otras-apis/events/connection/ws-echo');

        expect(
            await screen.findByText(
                'That link belongs to another of your origins, so it was left alone.',
            ),
        ).toBeVisible();
        expect(selectTabs(shellStore.getState())).toEqual([]);
    });

    it('opens nothing for a resource outside the workspace being read', async () => {
        await taking('mandor://local-apis/otro/connection/ws-echo');

        expect(
            await screen.findByText(
                'That link points outside the open workspace, so it was left alone.',
            ),
        ).toBeVisible();
        expect(selectTabs(shellStore.getState())).toEqual([]);
    });

    /** A blank tab says the app is broken. The URI says which line of the doc went stale. */
    it('shows the URI of a resource that is not there instead of an empty tab', async () => {
        const missing = 'mandor://local-apis/events/doc/falta.md';

        await taking(missing);

        expect(await screen.findByText('Mandor found nothing at that link.')).toBeVisible();
        expect(screen.getByText(missing)).toBeVisible();
        expect(selectTabs(shellStore.getState())).toEqual([]);
    });

    it('opens nothing for a link that names no resource at all', async () => {
        await taking('mandor://local-apis/events/nada/x');

        expect(
            await screen.findByText('That link does not name anything Mandor can open.'),
        ).toBeVisible();
        expect(selectTabs(shellStore.getState())).toEqual([]);
    });

    /** The file of a doc is an id nobody can write: its title is what a person links to. */
    it('opens the doc a link with no scheme names by its title', async () => {
        vi.spyOn(bridge.doc, 'list').mockResolvedValue(
            success([
                { name: 'readme.md', title: 'readme' },
                { name: 'd1a2.md', title: 'Guía de inicio' },
            ]),
        );

        await taking('<guía de inicio>', true);

        await waitFor(() => {
            expect(selectTabs(shellStore.getState()).map((tab) => tab.resource)).toEqual([
                'mandor://local-apis/events/doc/d1a2.md',
            ]);
        });
    });

    it('reads a link written as a file the same way', async () => {
        vi.spyOn(bridge.doc, 'list').mockResolvedValue(
            success([{ name: 'd1a2.md', title: 'Guía' }]),
        );

        await taking('./Gu%C3%ADa.md', true);

        await waitFor(() => {
            expect(selectTabs(shellStore.getState()).map((tab) => tab.resource)).toEqual([
                'mandor://local-apis/events/doc/d1a2.md',
            ]);
        });
    });

    it('says so when no doc of the workspace has that title', async () => {
        await taking('<Otra guía>');

        expect(await screen.findByText('Mandor found nothing at that link.')).toBeVisible();
        expect(selectTabs(shellStore.getState())).toEqual([]);
    });
});
