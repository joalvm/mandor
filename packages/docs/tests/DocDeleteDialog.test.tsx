import { fireEvent, render, screen } from '@testing-library/react';
import { success } from '@mandor/ipc';
import { bridge } from '@mandor/shell';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DocDeleteDialog } from '../src/components/sidebar/DocDeleteDialog.js';
import { docsStore } from '../src/docs-store.js';

import { AppProviders } from './support/app-providers.js';

beforeEach(() => {
    vi.restoreAllMocks();
    docsStore.getState().reset();
});

describe('the question before a doc is deleted', () => {
    it('names the doc as the list does, by its title and not by its file', () => {
        docsStore.getState().setDocs([{ name: 'k3m9x2q7a4bd.md', title: 'Getting started' }]);
        docsStore.getState().setDeleting('k3m9x2q7a4bd.md');
        render(<DocDeleteDialog workspaceId="events" />, { wrapper: AppProviders });

        const dialog = screen.getByRole('alertdialog');

        expect(dialog).toHaveTextContent('"Getting started" leaves the workspace');
        expect(dialog).not.toHaveTextContent('k3m9x2q7a4bd');
    });

    it('deletes the doc once it is confirmed', () => {
        const remove = vi.spyOn(bridge.doc, 'delete').mockResolvedValue(success({}));

        docsStore.getState().setDeleting('notas.md');
        render(<DocDeleteDialog workspaceId="events" />, { wrapper: AppProviders });
        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

        expect(remove).toHaveBeenCalledWith({ workspaceId: 'events', name: 'notas.md' });
        expect(docsStore.getState().deleting).toBeNull();
    });
});
