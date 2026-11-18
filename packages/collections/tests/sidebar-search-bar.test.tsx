import { success, type CollectionSearchHit } from '@mandor/ipc';
import { bridge, shellStore, setSidebarSearchQuery } from '@mandor/shell';
import { SidebarHeader } from '@mandor/shell/testing/sidebar';
import { declareTabKindSpec } from '@mandor/shell/testing/tab-kind';
import { cleanup, act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SidebarSearchBar } from '../src/components/search/SidebarSearchBar.js';
import { openSearchHit } from '../src/search/open-search-hit.js';
import { searchStore } from '../src/search/search-store.js';

import { AppProviders } from './support/app-providers.js';

const ENTRY = {
    name: 'Pedido creado',
    resource: 'mandor://local/events/item/pedidos/pedido-creado',
    source: 'item' as const,
    tags: ['cobro'],
    trail: 'Pedidos',
};

const ENVIRONMENT = {
    name: 'Local',
    resource: 'mandor://local/events/environment/local',
    source: 'environment' as const,
    tags: [],
    trail: '',
};

let unregister = (): void => undefined;

function typeQuery(value: string): HTMLElement {
    const field = screen.getByRole('searchbox', { name: 'Search workspace' });

    field.textContent = value;
    fireEvent.input(field);

    return field;
}

function renderField() {
    return render(
        <AppProviders>
            <SidebarHeader>
                <SidebarSearchBar entries={() => [ENTRY]} onOpenEnvironment={vi.fn()} />
            </SidebarHeader>
        </AppProviders>,
    );
}

beforeEach(() => {
    unregister = declareTabKindSpec({
        closable: true,
        icon: 'doc',
        id: 'item',
        title: () => 'Pedido creado',
    });
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', kind: 'local', name: 'Local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });
});

afterEach(() => {
    vi.useRealTimers();
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();

    unregister();
    shellStore.getState().reset();
    searchStore.getState().reset();
    setSidebarSearchQuery('');
});

describe('the field of the sidebar search', () => {
    it('publishes the hits of the workspace while the query carries', () => {
        renderField();
        typeQuery('pedido');

        expect(searchStore.getState().hits.map((hit) => hit.name)).toEqual(['Pedido creado']);
    });

    it('opens the first result with Enter', () => {
        renderField();
        const field = typeQuery('pedido');

        fireEvent.keyDown(field, { key: 'Enter' });

        expect(JSON.stringify(shellStore.getState().grid)).toContain(ENTRY.resource);
    });

    it('opens the first result in the group beside with Alt+Enter', () => {
        renderField();
        const field = typeQuery('pedido');

        fireEvent.keyDown(field, { altKey: true, key: 'Enter' });

        expect(shellStore.getState().grid.kind).toBe('branch');
    });

    /** An environment is read in the dialog of environments, never in a tab of its own. */
    it('hands an environment result to whoever opens the dialog of environments', () => {
        const onOpenEnvironment = vi.fn();

        render(
            <AppProviders>
                <SidebarHeader>
                    <SidebarSearchBar
                        entries={() => [ENVIRONMENT]}
                        onOpenEnvironment={onOpenEnvironment}
                    />
                </SidebarHeader>
            </AppProviders>,
        );
        typeQuery('local');
        const field = screen.getByRole('searchbox', { name: 'Search workspace' });

        fireEvent.keyDown(field, { key: 'Enter' });

        expect(onOpenEnvironment).toHaveBeenCalledWith('events', 'local');
        expect(shellStore.getState().grid).toEqual({
            kind: 'leaf',
            id: 'root',
            tabs: [],
            activeTab: null,
        });
    });

    it('takes the hits away when the field empties', () => {
        renderField();
        typeQuery('pedido');
        typeQuery('');

        expect(searchStore.getState().hits).toEqual([]);
    });

    /** The results of the workspace just left must not stand in for the one just opened. */
    it('empties the search when the workspace changes', () => {
        renderField();
        typeQuery('pedido');

        expect(searchStore.getState().hits).not.toEqual([]);

        act(() => {
            shellStore.setState({ activeWorkspaceId: 'other' });
        });

        expect(searchStore.getState().hits).toEqual([]);
        expect(screen.getByRole('searchbox', { name: 'Search workspace' }).textContent).toBe('');
    });

    /** An answer to a query the box no longer holds would cover the answer to what it holds. */
    it('drops a content answer that lands after the query moved on', async () => {
        const answers: ((hits: CollectionSearchHit[]) => void)[] = [];
        const stale: CollectionSearchHit = {
            line: 3,
            resource: 'mandor://local/events/doc/old.md',
            source: 'doc',
        };

        vi.useFakeTimers();
        vi.spyOn(bridge.collections, 'search').mockImplementation(
            () =>
                new Promise((resolve) => {
                    answers.push((hits) => {
                        resolve(success(hits));
                    });
                }),
        );
        renderField();
        typeQuery('pedido');
        await act(() => vi.advanceTimersByTimeAsync(150));
        typeQuery('pedido creado');
        await act(() => vi.advanceTimersByTimeAsync(150));
        await act(async () => {
            answers[1]?.([]);
            answers[0]?.([stale]);
            await vi.advanceTimersByTimeAsync(0);
        });

        expect(answers).toHaveLength(2);
        expect(searchStore.getState().hits.map((hit) => hit.name)).toEqual(['Pedido creado']);
    });

    /** A line of content is a row of the entry it sits in, which says its name and where it hangs. */
    it('lists a hit of content as the entry it belongs to', async () => {
        const hit: CollectionSearchHit = { line: 4, resource: ENTRY.resource, source: 'item' };

        vi.useFakeTimers();
        vi.spyOn(bridge.collections, 'search').mockResolvedValue(success([hit]));
        renderField();
        typeQuery('cobrado');
        await act(() => vi.advanceTimersByTimeAsync(150));

        expect(searchStore.getState().hits).toEqual([{ ...ENTRY, matched: 'content' }]);
    });

    /** openSearchHit is the one way a hit opens, and a kind with no tab opens nothing. */
    it('opens nothing through openSearchHit for a kind this window cannot draw', () => {
        const onOpenEnvironment = vi.fn();

        openSearchHit({ ...ENVIRONMENT, matched: 'name' }, false, onOpenEnvironment);

        expect(onOpenEnvironment).toHaveBeenCalledWith('events', 'local');
    });
});
