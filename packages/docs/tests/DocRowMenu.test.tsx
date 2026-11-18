import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { DocRow } from '../src/components/sidebar/DocRow.js';
import { docsStore } from '../src/docs-store.js';

import { AppProviders } from './support/app-providers.js';

function row(): void {
    render(<DocRow name="readme.md" title="readme" workspaceId="events" />, {
        wrapper: AppProviders,
    });
}

function openMenu(): void {
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Row options' }), {
        button: 0,
        ctrlKey: false,
    });
}

beforeEach(() => {
    docsStore.getState().reset();
});

describe('what a row of the list offers', () => {
    it('offers renaming and deleting', async () => {
        row();
        openMenu();

        expect(await screen.findByRole('menuitem', { name: 'Rename' })).toBeVisible();
        expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
            'Rename',
            'Delete',
        ]);
    });

    it('asks before deleting the doc of the row', async () => {
        row();
        openMenu();
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }));

        expect(docsStore.getState().deleting).toBe('readme.md');
    });

    it('puts the field on the row it was opened from', async () => {
        row();
        openMenu();
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Rename' }));

        expect(docsStore.getState().renaming).toBe('readme.md');
    });

    it('says a doc nothing could be read from has no name', () => {
        render(<DocRow name="enorme.md" title="" workspaceId="events" />, {
            wrapper: AppProviders,
        });

        expect(screen.getByRole('option', { name: /Untitled/u })).toBeInTheDocument();
    });
});
