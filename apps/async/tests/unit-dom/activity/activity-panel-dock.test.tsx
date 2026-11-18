import { MessagesProvider } from '@mandor/i18n';
import type { ActivityRecord } from '@mandor/ipc';
import type { ResourceUri } from '@mandor/schema';
import { TooltipProvider } from '@mandor/ui';
import { allByPart } from '@mandor/ui/testing';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
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
                <ActivityPanel
                    entries={ENTRIES}
                    label="Actividad"
                    onClear={vi.fn()}
                    onExport={vi.fn()}
                    resource={RESOURCE}
                    resizeLabel="Redimensionar"
                />
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
});
