import { shellStore } from '@mandor/shell';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ImportIconDoor } from '../../src/import/components/dialog/ImportIconDoor.js';

import { AppProviders } from '../support/providers.js';

beforeEach(() => {
    shellStore.getState().reset();
});

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();
    shellStore.getState().reset();
});

describe('the door of a collection import', () => {
    it('is an icon that opens the import once a workspace is open', () => {
        const onOpen = vi.fn();

        shellStore.getState().setActiveWorkspace('personal');
        render(<ImportIconDoor onOpen={onOpen} />, { wrapper: AppProviders });
        fireEvent.click(screen.getByRole('button', { name: 'Import a document' }));

        expect(onOpen).toHaveBeenCalledTimes(1);
    });

    it('waits while no workspace is open, because the collection would have nowhere to go', () => {
        render(<ImportIconDoor onOpen={vi.fn()} />, { wrapper: AppProviders });

        expect(screen.getByRole('button', { name: 'Import a document' })).toBeDisabled();
    });
});
