import { MessagesProvider } from '@mandor/i18n';
import type { ActivityRecord } from '@mandor/ipc';
import type { ResourceUri } from '@mandor/schema';
import { ToastProvider, TooltipProvider } from '@mandor/ui';
import { paneLayoutStore, togglePaneLayout } from '@mandor/shell';
import { allByPart, byPart } from '@mandor/ui/testing';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ActivityEntry } from '../../../src/renderer/activity/activity-entry.js';
import { activityStore } from '../../../src/renderer/activity/activity-store.js';
import { ActivityPanel } from '../../../src/renderer/activity/components/panel/ActivityPanel.js';

const RESOURCE = 'mandor://demo/payments/connection/alpha' as ResourceUri;

function entry(id: string, direction: 'in' | 'out'): ActivityEntry {
    const record: ActivityRecord = { at: 1, data: 'hola', direction };

    return {
        at: record.at,
        bytes: 9,
        detail: { ...record, environmentId: null },
        id,
        kind: 'connection-message',
    };
}

const ENTRIES = [entry('one', 'in'), entry('two', 'out'), entry('three', 'in')];

function draw(): void {
    render(
        <MessagesProvider preferences={{ language: 'es' }}>
            <TooltipProvider>
                <ToastProvider
                    messages={{ close: 'Cerrar aviso', more: (count) => `+${String(count)}` }}
                >
                    <ActivityPanel
                        entries={ENTRIES}
                        label="Actividad"
                        onClear={vi.fn()}
                        onExport={vi.fn()}
                        resource={RESOURCE}
                        resizeLabel="Redimensionar"
                    />
                </ToastProvider>
            </TooltipProvider>
        </MessagesProvider>,
    );
}

function rows(): HTMLElement[] {
    return within(screen.getByRole('log', { name: 'Actividad' })).getAllByRole('option');
}

describe('the dock of the timeline', () => {
    afterEach(() => {
        // The window goes first: resetting a store under a mounted tree is an update outside act.
        cleanup();

        activityStore.getState().reset();
        paneLayoutStore.setState(paneLayoutStore.getInitialState());
    });

    /** The dock stands across the way the message and the activity stand, so each keeps its room. */
    it('stands the dock under the timeline, and beside it once the layout turns', () => {
        draw();

        expect(byPart('split-pane')).toHaveAttribute('data-direction', 'column');

        act(() => {
            togglePaneLayout();
        });

        expect(byPart('split-pane')).toHaveAttribute('data-direction', 'row');
    });

    /** The detail is what a selection opens, never a fixture of the panel. */
    it('keeps the dock out of the panel while no line is marked', () => {
        draw();

        expect(allByPart('activity-dock')).toHaveLength(0);
        expect(rows()).toHaveLength(3);
    });

    it('opens the dock on clicking a line and closes it from its own band', () => {
        draw();

        fireEvent.click(rows()[0] ?? document.body);

        expect(allByPart('activity-dock')).toHaveLength(1);

        fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));

        expect(allByPart('activity-dock')).toHaveLength(0);
        expect(rows()).toHaveLength(3);
    });

    /** The reader opened a line where they were: the timeline beside the dock is the same one. */
    it('keeps the timeline it had when a line opens the dock and when the dock closes', () => {
        draw();

        const log = screen.getByRole('log', { name: 'Actividad' });

        fireEvent.click(rows()[1] ?? document.body);

        expect(screen.getByRole('log', { name: 'Actividad' })).toBe(log);

        fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));

        expect(screen.getByRole('log', { name: 'Actividad' })).toBe(log);
    });

    /** The band carries the discoverable way out, but the marked line stays one too. */
    it('closes the dock on clicking the marked line again', () => {
        draw();

        fireEvent.click(rows()[0] ?? document.body);

        expect(allByPart('activity-dock')).toHaveLength(1);

        fireEvent.click(rows()[0] ?? document.body);

        expect(allByPart('activity-dock')).toHaveLength(0);
    });

    /** The list and the detail are two panels: each its own card, the gutter between them. */
    it('draws the dock in a card of its own, apart from the card of the timeline', () => {
        draw();

        fireEvent.click(rows()[0] ?? document.body);

        const dock = byPart('activity-dock');

        expect(screen.getByRole('region', { name: 'Detalle' })).toContainElement(dock);
        expect(screen.getByRole('region', { name: 'Actividad' })).not.toContainElement(dock);
        expect(screen.getByRole('region', { name: 'Actividad' })).toContainElement(
            screen.getByRole('log', { name: 'Actividad' }),
        );
    });
});
