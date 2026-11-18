import { shellStore, Sidebar } from '@mandor/shell';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ConnectionsSection } from '../../../../src/renderer/features/connections/components/sidebar/ConnectionsSection.js';
import { connectionsStore } from '../../../../src/renderer/features/connections/index.js';

import { AppProviders } from '../../support/app-providers.js';

beforeEach(() => {
    connectionsStore.getState().reset();
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local APIs', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });
});

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();
    connectionsStore.getState().reset();
    shellStore.getState().reset();
});

describe('the section of the connections', () => {
    it('puts the connections of the workspace in the lateral while it is mounted', () => {
        const view = render(
            <>
                <ConnectionsSection order={30} />
                <Sidebar />
            </>,
            { wrapper: AppProviders },
        );

        expect(screen.getByRole('button', { name: 'Connections' })).toHaveAttribute(
            'aria-expanded',
            'true',
        );
        expect(screen.queryByRole('listbox', { name: 'Connections' })).toBeNull();

        view.rerender(<Sidebar />);

        expect(screen.queryByRole('button', { name: 'Connections' })).toBeNull();
    });
});
