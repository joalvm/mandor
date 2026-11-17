import { shellStore } from '@mandor/shell';
import { WorkspacePanel } from '@mandor/workspace';
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SyncPanelActions } from '../../../src/renderer/app/SyncPanelActions.js';

import { AppProviders } from '../support/app-providers.js';

function page(added: ReactNode) {
    return (
        <AppProviders>
            {added}
            <WorkspacePanel />
        </AppProviders>
    );
}

beforeEach(() => {
    shellStore.getState().reset();
    shellStore.getState().setActiveWorkspace('personal');
});

afterEach(() => {
    cleanup();
});

describe('the actions Sync adds to the workspaces page', () => {
    it('stand on the page while the app declares them, and leave with it', () => {
        const view = render(page(<SyncPanelActions />));

        expect(screen.getAllByRole('button', { name: 'Authentication' }).length).toBeGreaterThan(0);
        // The variables of the workspace are gone: the globals live with the environments.
        expect(screen.queryByRole('button', { name: 'Variables' })).toBeNull();

        view.rerender(page(null));

        expect(screen.queryByRole('button', { name: 'Authentication' })).toBeNull();
    });

    it('add the import that makes a workspace and the export of the open one', () => {
        const view = render(page(<SyncPanelActions />));

        expect(screen.getByRole('button', { name: 'Import a workspace' })).toBeVisible();
        expect(screen.getByRole('button', { name: 'Export a workspace' })).toBeVisible();

        // The actions load their state as they stand: leaving first keeps the update inside act.
        view.rerender(page(null));
    });
});
