import { shellStore } from '@mandor/shell';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ImportDialogAction } from '../../src/import/components/dialog/ImportDialogAction.js';

import { AppProviders } from '../support/providers.js';

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();
    shellStore.getState().reset();
});

describe('the import action', () => {
    it('is a button with words on the workspace scope, and it opens the dialog', () => {
        render(
            <ImportDialogAction
                formats={[{ label: 'AsyncAPI', hint: '2.x or 3.x', input: 'files' }]}
                onImported={vi.fn()}
                scope="workspace"
            />,
            { wrapper: AppProviders },
        );

        fireEvent.click(screen.getByRole('button', { name: 'Import a workspace' }));

        expect(screen.getByRole('dialog', { name: 'Import a document' })).toBeVisible();
    });

    it('is an icon on the collection scope, and it opens the same dialog', () => {
        shellStore.getState().setActiveWorkspace('personal');
        render(
            <ImportDialogAction
                formats={[{ label: 'AsyncAPI', hint: '2.x or 3.x', input: 'files' }]}
                onImported={vi.fn()}
                scope="collection"
            />,
            { wrapper: AppProviders },
        );

        fireEvent.click(screen.getByRole('button', { name: 'Import a document' }));

        expect(screen.getByRole('dialog', { name: 'Import a document' })).toBeVisible();
    });

    it('paints nothing when the app offers no format', () => {
        render(<ImportDialogAction formats={[]} onImported={vi.fn()} scope="workspace" />, {
            wrapper: AppProviders,
        });

        expect(screen.queryByRole('button')).toBeNull();
    });
});
