import { shellStore, Sidebar } from '@mandor/shell';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { collectionsSectionActionDeclarations } from '../src/collection-actions.js';
import { collectionStore } from '../src/collection-store.js';
import { CollectionsSection } from '../src/components/sidebar/CollectionsSection.js';
import { CollectionsSectionAction } from '../src/components/sidebar/CollectionsSectionAction.js';

import { AppProviders } from './support/app-providers.js';

beforeEach(() => {
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', kind: 'local', name: 'Local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });
});

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();
    collectionStore.getState().reset();
    shellStore.getState().reset();
});

describe('what the app declares into the header of the section (CollectionsSectionAction)', () => {
    it('draws beside the button that makes a collection, while the declaration is mounted', () => {
        const view = render(
            <>
                <CollectionsSection order={20}>
                    <CollectionsSectionAction id="bring">
                        <button type="button">Bring in</button>
                    </CollectionsSectionAction>
                </CollectionsSection>
                <Sidebar />
            </>,
            { wrapper: AppProviders },
        );

        expect(screen.getByRole('button', { name: 'New collection' })).toBeVisible();
        expect(screen.getByRole('button', { name: 'Bring in' })).toBeVisible();

        view.rerender(
            <>
                <CollectionsSection order={20} />
                <Sidebar />
            </>,
        );

        expect(screen.queryByRole('button', { name: 'Bring in' })).toBeNull();
        expect(collectionsSectionActionDeclarations.list()).toEqual([]);
    });

    it('keeps the order in which the app wrote them', () => {
        render(
            <>
                <CollectionsSection order={20}>
                    <CollectionsSectionAction id="first">
                        <button type="button">First</button>
                    </CollectionsSectionAction>
                    <CollectionsSectionAction id="second">
                        <button type="button">Second</button>
                    </CollectionsSectionAction>
                </CollectionsSection>
                <Sidebar />
            </>,
            { wrapper: AppProviders },
        );

        const names = screen
            .getAllByRole('button')
            .map((button) => button.getAttribute('aria-label') ?? button.textContent);

        expect(names.indexOf('First')).toBeLessThan(names.indexOf('Second'));
    });
});
