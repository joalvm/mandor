import { shellStore } from '@mandor/shell';
import { cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ImportDialogAction } from '../../src/import/components/dialog/ImportDialogAction.js';
import { useImportDialog } from '../../src/import/hooks/useImportDialog.js';

import { AppProviders } from '../support/providers.js';

/** Another way in, as an app would draw it: it does its own work and closes the import. */
function PasteInstead() {
    const { close } = useImportDialog();

    return (
        <button onClick={close} type="button">
            Paste instead
        </button>
    );
}

beforeEach(() => {
    shellStore.getState().setActiveWorkspace('personal');
});

afterEach(() => {
    cleanup();
    shellStore.getState().reset();
});

describe('what the app draws in the import (import-dialog-context)', () => {
    it('stands above the dropzone and closes the import it sits in', () => {
        render(
            <ImportDialogAction
                formats={[{ label: 'OpenAPI', hint: '3.x', input: 'files' }]}
                onImported={vi.fn()}
                scope="collection"
            >
                <PasteInstead />
            </ImportDialogAction>,
            { wrapper: AppProviders },
        );

        fireEvent.click(screen.getByRole('button', { name: 'Import a document' }));
        fireEvent.click(screen.getByRole('button', { name: 'Paste instead' }));

        expect(screen.queryByRole('dialog', { name: 'Import a document' })).toBeNull();
    });

    it('is read only inside the import', () => {
        expect(() => {
            renderHook(() => useImportDialog());
        }).toThrow('useImportDialog is only read inside the import dialog.');
    });
});
