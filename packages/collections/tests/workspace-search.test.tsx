import { MessagesProvider } from '@mandor/i18n';
import {
    Sidebar,
    SidebarSection,
    SidebarSectionBody,
    setSidebarSearchQuery,
    shellStore,
    windowSurface,
    type WorkspaceEntries,
} from '@mandor/shell';
import { TooltipProvider } from '@mandor/ui';
import { allByPart } from '@mandor/ui/testing';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { collectionStore } from '../src/collection-store.js';
import { SEARCH_SURFACE, WorkspaceSearch } from '../src/components/search/WorkspaceSearch.js';

const PEDIDOS = {
    name: 'Pedidos',
    resource: 'mandor://local/events/doc/pedidos',
    source: 'doc' as const,
    tags: [],
    trail: '',
};
const DOCS = vi.fn<WorkspaceEntries>(() => [PEDIDOS]);
const SEARCH = { sources: [DOCS], openEnvironment: vi.fn() };

function window(searching = true) {
    return (
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>
                <SidebarSection id="docs" order={10} title="shell:commandPalette">
                    <SidebarSectionBody>
                        <p>the docs</p>
                    </SidebarSectionBody>
                </SidebarSection>
                {searching && <WorkspaceSearch {...SEARCH} />}
                <Sidebar />
            </TooltipProvider>
        </MessagesProvider>
    );
}

function renderSidebar() {
    return render(window());
}

async function typeQuery(value: string): Promise<HTMLElement> {
    const field = screen.getByRole('searchbox', { name: 'Search workspace' });

    field.textContent = value;
    await act(() => {
        fireEvent.input(field);

        return Promise.resolve();
    });

    return field;
}

beforeEach(() => {
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', kind: 'local', name: 'Local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });
    collectionStore.setState({
        nodes: [
            {
                kind: 'item',
                itemKind: 'event',
                name: 'Pedido creado',
                path: 'pedidos/pedido-creado',
                tags: ['cobro'],
            },
        ],
    });
});

afterEach(() => {
    // The window goes first: the stores reset below, and a mounted bar would hear them.
    cleanup();

    collectionStore.getState().reset();
    shellStore.getState().reset();
    DOCS.mockClear();
    setSidebarSearchQuery('');
});

describe('the searcher of the sidebar', () => {
    it('declares one searcher for the bar while it is mounted', () => {
        render(window(false));

        expect(allByPart('sidebar-header')).toEqual([]);

        cleanup();
        renderSidebar();

        expect(allByPart('sidebar-header')).toHaveLength(1);
    });

    it('draws the field in the header and the sections in the body while the query is short', () => {
        renderSidebar();

        expect(allByPart('sidebar-header')).toHaveLength(1);
        expect(screen.getByText('the docs')).toBeVisible();
    });

    it('swaps the body to the results from two letters and back on empty', async () => {
        renderSidebar();
        await typeQuery('pedido');

        expect(screen.getByRole('option', { name: /Pedido creado/u })).toBeVisible();
        expect(screen.queryByText('the docs')).toBeNull();

        const field = screen.getByRole('searchbox', { name: 'Search workspace' });

        field.textContent = '';
        fireEvent.input(field);

        expect(screen.queryByRole('option')).toBeNull();
        expect(screen.getByText('the docs')).toBeVisible();
    });

    it('finds the items of the workspace and what each source brings for it', async () => {
        renderSidebar();
        await typeQuery('pedido');

        expect(screen.getByRole('option', { name: /Pedido creado/u })).toBeVisible();
        expect(screen.getByRole('option', { name: /Pedidos/u })).toBeVisible();
        expect(DOCS).toHaveBeenCalledWith('Local', 'events', expect.any(Function));
    });

    it('asks no source while no workspace is open', async () => {
        shellStore.setState({ activeWorkspaceId: null });
        renderSidebar();
        await typeQuery('pedido');

        expect(screen.queryByRole('option')).toBeNull();
        expect(DOCS).not.toHaveBeenCalled();
    });

    /** The surface exists to put the caret in the field, which never unmounts: no frames to wait. */
    it('focuses the field of the header when the surface opens', () => {
        renderSidebar();

        windowSurface(SEARCH_SURFACE)?.open(shellStore.getState());

        expect(screen.getByRole('searchbox', { name: 'Search workspace' })).toHaveFocus();
    });

    it('takes the searcher away and leaves the bar to the sections, query cleared', () => {
        const view = renderSidebar();

        act(() => {
            setSidebarSearchQuery('pedido');
        });
        view.rerender(window(false));

        expect(allByPart('sidebar-header')).toEqual([]);
        expect(screen.queryByRole('textbox')).toBeNull();
        expect(screen.getByText('the docs')).toBeVisible();
    });
});
