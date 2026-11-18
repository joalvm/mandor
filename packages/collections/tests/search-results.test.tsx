import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SearchResults } from '../src/components/search/SearchResults.js';
import { searchStore } from '../src/search/search-store.js';

import { AppProviders } from './support/app-providers.js';

const HIT = {
    matched: 'name' as const,
    name: 'Pedido creado',
    resource: 'mandor://local/events/item/pedidos/pedido-creado',
    source: 'item' as const,
    tags: ['cobro'],
    trail: 'Pedidos / Cobros',
};

function renderResults() {
    return render(
        <AppProviders>
            <SearchResults onOpenEnvironment={vi.fn()} />
        </AppProviders>,
    );
}

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();

    searchStore.getState().reset();
});

describe('the results of the sidebar search', () => {
    it('lists the hits the field published, saying which field matched', () => {
        searchStore.getState().setHits([HIT]);
        renderResults();

        expect(screen.getAllByRole('option')).toHaveLength(1);
        expect(screen.getByRole('option', { name: /Pedido creado/u })).toBeVisible();
        expect(screen.getByRole('listbox', { name: 'Search results' })).toBeVisible();
    });

    it('says where a hit lives by the names that hold it, never by a path', () => {
        searchStore.getState().setHits([HIT]);
        renderResults();

        const row = screen.getByRole('option', { name: /Pedido creado/u });

        expect(row).toHaveTextContent('Pedidos / Cobros');
        expect(row).not.toHaveTextContent('pedido-creado');
    });

    it('draws no place for a hit that nothing holds', () => {
        searchStore.getState().setHits([{ ...HIT, trail: '' }]);
        renderResults();

        expect(screen.getByRole('option', { name: /Pedido creado/u })).not.toHaveTextContent('·');
    });

    it('says there is nothing while the hits are empty', () => {
        renderResults();

        expect(screen.queryByRole('listbox')).toBeNull();
        expect(screen.getByRole('status').textContent).toContain('No matches.');
    });
});
