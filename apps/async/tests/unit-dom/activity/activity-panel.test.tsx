import { MessagesProvider } from '@mandor/i18n';
import type { ActivityRecord } from '@mandor/ipc';
import type { ResourceUri } from '@mandor/schema';
import { TooltipProvider } from '@mandor/ui';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ActivityEntry } from '../../../src/renderer/activity/activity-entry.js';
import { activityStore } from '../../../src/renderer/activity/activity-store.js';
import { ActivityPanel } from '../../../src/renderer/activity/components/panel/ActivityPanel.js';

const RESOURCE = 'mandor://demo/payments/connection/alpha' as ResourceUri;

type EntryInput = {
    id: string;
    direction: 'in' | 'out';
    bytes: number;
    data?: string;
    schemaUnmet?: boolean;
};

function entry({
    id,
    direction,
    bytes,
    data = 'hola',
    schemaUnmet = false,
}: EntryInput): ActivityEntry {
    const record: ActivityRecord = { at: 1, data, direction };

    if (schemaUnmet) {
        record.schemaUnmet = true;
    }

    return {
        at: record.at,
        bytes,
        detail: { ...record, environmentId: null },
        id,
        kind: 'connection-message',
    };
}

const ENTRIES = [
    entry({ id: 'one', direction: 'in', bytes: 8 }),
    entry({ id: 'two', direction: 'out', bytes: 7 }),
    entry({ id: 'three', direction: 'in', bytes: 40 }),
];

function draw({
    entries = ENTRIES,
    onClear = vi.fn(),
    onExport = vi.fn(),
}: {
    entries?: ActivityEntry[];
    onClear?: () => void;
    onExport?: () => void;
} = {}) {
    return {
        onClear,
        onExport,
        view: render(
            <MessagesProvider preferences={{ language: 'es' }}>
                <TooltipProvider>
                    <ActivityPanel
                        entries={entries}
                        label="Actividad"
                        onClear={onClear}
                        onExport={onExport}
                        resource={RESOURCE}
                        resizeLabel="Redimensionar"
                    />
                </TooltipProvider>
            </MessagesProvider>,
        ),
    };
}

/** Radix opens the menu on pointerdown of its trigger, and runs the line on click. */
function openFilterMenu(): void {
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Filtrar' }), {
        button: 0,
        ctrlKey: false,
    });
}

function rows(): HTMLElement[] {
    return within(screen.getByRole('log', { name: 'Actividad' })).getAllByRole('option');
}

describe('the timeline of a resource', () => {
    afterEach(() => {
        // The window goes first: resetting a store under a mounted tree is an update outside act.
        cleanup();

        activityStore.getState().reset();
    });

    it('runs export and clean through the head the user acts on', () => {
        const { onClear, onExport } = draw();

        fireEvent.click(screen.getByRole('button', { name: 'Exportar' }));
        fireEvent.click(screen.getByRole('button', { name: 'Limpiar' }));

        expect(onExport).toHaveBeenCalledOnce();
        expect(onClear).toHaveBeenCalledOnce();
    });

    it('opens the filter menu with the three sides and the way back to all of them', async () => {
        draw();

        openFilterMenu();

        expect(await screen.findByRole('menuitem', { name: 'Recibido' })).toBeVisible();
        expect(screen.getByRole('menuitem', { name: 'Enviado' })).toBeVisible();
        expect(screen.getByRole('menuitem', { name: 'Error' })).toBeVisible();

        // Radix marks a disabled line with the attribute, not with the property.
        expect(screen.getByRole('menuitem', { name: 'Mostrar todo' })).toHaveAttribute(
            'aria-disabled',
            'true',
        );
    });

    it('hides the side unchecked in the menu and brings every side back', async () => {
        draw();

        openFilterMenu();
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Recibido' }));

        expect(rows()).toHaveLength(1);

        openFilterMenu();
        fireEvent.click(screen.getByRole('menuitem', { name: 'Mostrar todo' }));

        expect(rows()).toHaveLength(3);
    });

    it('narrows the timeline to the entries whose text carries the search', () => {
        draw({
            entries: [
                entry({ id: 'one', direction: 'in', bytes: 8, data: 'primero' }),
                entry({ id: 'two', direction: 'out', bytes: 7, data: 'segundo' }),
            ],
        });

        const search = screen.getByRole('searchbox', { name: 'Buscar' });

        search.textContent = 'SEGUNDO';
        fireEvent.input(search);

        expect(rows()).toHaveLength(1);
    });

    /** The entry criterion: the filter is a view, so it never takes an entry off the buffer. */
    it('keeps only what the schema mark names and hands every entry back once it is lifted', async () => {
        draw({
            entries: [
                entry({ id: 'one', direction: 'in', bytes: 8 }),
                entry({ id: 'two', direction: 'out', bytes: 7, schemaUnmet: true }),
            ],
        });

        openFilterMenu();
        fireEvent.click(
            await screen.findByRole('menuitem', { name: 'Solo las que incumplen su schema' }),
        );

        expect(rows()).toHaveLength(1);

        openFilterMenu();
        fireEvent.click(screen.getByRole('menuitem', { name: 'Solo las que incumplen su schema' }));

        expect(rows()).toHaveLength(2);
    });

    /** The filter lives in the store beside the buffer: a tab moved between groups keeps it. */
    it('keeps the filter the head set when the panel is drawn again for the same resource', async () => {
        const { view } = draw();

        openFilterMenu();
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Enviado' }));

        expect(rows()).toHaveLength(2);

        view.unmount();
        draw();

        expect(rows()).toHaveLength(2);
    });
});
