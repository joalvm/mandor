import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useActivityExport } from '../../../../src/renderer/features/connections/hooks/useActivityExport.js';
import { asyncBridge } from '../../../../src/renderer/app/async-bridge.js';
import type { ActivityEntry } from '../../../../src/renderer/activity/activity-entry.js';
import { failure, success } from '@mandor/ipc';

import { AppProviders } from '../../support/app-providers.js';

const ENTRY: ActivityEntry = {
    at: 5,
    bytes: 9,
    detail: { at: 5, data: 'hola', direction: 'in', environmentId: null },
    id: 'a',
    kind: 'connection-message',
};

const notify = vi.fn();

function Exporter(): ReactNode {
    const onExport = useActivityExport([ENTRY]);

    return (
        <button onClick={onExport} type="button">
            exportar
        </button>
    );
}

function Harness(): ReactNode {
    return (
        <AppProviders onNotify={notify}>
            <Exporter />
        </AppProviders>
    );
}

describe('the activity export of the connection panel', () => {
    beforeEach(() => {
        notify.mockClear();
    });

    it('sends the timeline to the export channel and stays quiet on success', async () => {
        const jsonl = vi.spyOn(asyncBridge.export, 'jsonl').mockImplementation(() => {
            return Promise.resolve(success({ path: '/tmp/activity.jsonl' }));
        });

        render(<Harness />);
        fireEvent.click(screen.getByRole('button', { name: 'exportar' }));

        await waitFor(() => {
            expect(jsonl).toHaveBeenCalledOnce();
        });
        expect(notify).not.toHaveBeenCalled();
        expect(jsonl.mock.calls[0]?.[0]?.suggestedName).toBe('activity.jsonl');

        jsonl.mockRestore();
    });

    it('tells a failed write in the words of its code', async () => {
        const jsonl = vi.spyOn(asyncBridge.export, 'jsonl').mockImplementation(() => {
            return Promise.resolve(failure('fs-write', 'no room'));
        });

        render(<Harness />);
        fireEvent.click(screen.getByRole('button', { name: 'exportar' }));

        await waitFor(() => {
            expect(notify).toHaveBeenCalledWith({
                title: 'Mandor could not save the requested file.',
                tone: 'error',
            });
        });

        jsonl.mockRestore();
    });
});
