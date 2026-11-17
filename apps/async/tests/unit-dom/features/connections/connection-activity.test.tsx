import { MessagesProvider } from '@mandor/i18n';
import { success } from '@mandor/ipc';
import type { ResourceUri } from '@mandor/schema';
import { ToastProvider, TooltipProvider } from '@mandor/ui';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ActivityEntry } from '../../../../src/renderer/activity/activity-entry.js';
import { activityStore } from '../../../../src/renderer/activity/activity-store.js';
import { ConnectionActivity } from '../../../../src/renderer/features/connections/components/panel/ConnectionActivity.js';
import { asyncBridge } from '../../../../src/renderer/app/async-bridge.js';

const RESOURCE = 'mandor://demo/payments/connection/alpha' as ResourceUri;

const ENTRY: ActivityEntry = {
    at: 1,
    bytes: 9,
    detail: { at: 1, data: 'hola', direction: 'in', environmentId: null },
    id: 'one',
    kind: 'connection-message',
};

function draw(entries: ActivityEntry[] = [ENTRY]): void {
    render(
        <MessagesProvider preferences={{ language: 'es' }}>
            <ToastProvider messages={{ close: 'Cerrar', more: (count) => `+${String(count)}` }}>
                <TooltipProvider>
                    <ConnectionActivity resource={RESOURCE} timeline={entries} />
                </TooltipProvider>
            </ToastProvider>
        </MessagesProvider>,
    );
}

describe('the timeline of the connection panel', () => {
    afterEach(() => {
        // The window goes first: resetting a store under a mounted tree is an update outside act.
        cleanup();

        activityStore.getState().reset();
    });

    it('clears what its resource holds, and nothing else', () => {
        activityStore.getState().appendActivity(RESOURCE, [ENTRY]);

        draw();

        expect(screen.getByRole('log', { name: 'Actividad' })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Limpiar' }));

        expect(activityStore.getState().entries[RESOURCE]).toBeUndefined();
    });

    it('hands the timeline to the export the head runs', async () => {
        const jsonl = vi
            .spyOn(asyncBridge.export, 'jsonl')
            .mockImplementation(() => Promise.resolve(success({ path: '/tmp/run.jsonl' })));

        draw();

        fireEvent.click(screen.getByRole('button', { name: 'Exportar' }));

        await vi.waitFor(() => {
            expect(jsonl).toHaveBeenCalledOnce();
        });
        expect(jsonl.mock.calls[0]?.[0]?.records).toHaveLength(1);

        jsonl.mockRestore();
    });
});
