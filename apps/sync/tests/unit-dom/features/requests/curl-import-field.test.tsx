import { failure, leavesOf, success } from '@mandor/ipc';
import type { CurlParse } from '@mandor/schema';
import { shellStore } from '@mandor/shell';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SyncImportAction } from '../../../../src/renderer/app/SyncImportAction.js';
import { syncBridge } from '../../../../src/renderer/app/sync-bridge.js';
import { requestsStore } from '../../../../src/renderer/features/requests/requests-store.js';
import { AppProviders } from '../../support/app-providers.js';

const CURL = 'curl -X POST http://api.test/orders';

const PARSED: CurlParse = {
    kind: 'parsed',
    notices: [],
    request: {
        body: { content: '{}', type: 'json' },
        headers: [],
        method: 'POST',
        query: [],
        settings: {},
        url: 'http://api.test/orders',
    },
};

function openTabs() {
    return leavesOf(shellStore.getState().grid).flatMap((leaf) => leaf.tabs);
}

/** The import open, with a command typed in its curl field and opened as a request. */
function openAsRequest(text: string) {
    const notify = vi.fn();

    render(<SyncImportAction />, {
        wrapper: ({ children }) => <AppProviders onNotify={notify}>{children}</AppProviders>,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Import a document' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Or paste a curl command' }), {
        target: { value: text },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Open as request' }));

    return notify;
}

beforeEach(() => {
    vi.restoreAllMocks();
    requestsStore.getState().reset();
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'local' });
});

afterEach(() => {
    cleanup();
    requestsStore.getState().reset();
    shellStore.getState().reset();
});

describe('a curl command brought in by the import (CurlImportField)', () => {
    it('opens as a request saved nowhere, filled by the command, and the import closes', async () => {
        const fromCurl = vi
            .spyOn(syncBridge.codegen, 'fromCurl')
            .mockResolvedValue(success(PARSED));
        const notify = openAsRequest(CURL);

        await waitFor(() => {
            expect(openTabs().map((tab) => tab.kind)).toEqual(['loose-request']);
        });

        const resource = openTabs()[0]?.resource ?? '';

        expect(fromCurl).toHaveBeenCalledWith({ text: CURL });
        expect(requestsStore.getState().requests[resource]).toMatchObject({
            method: 'POST',
            name: 'New request',
            url: 'http://api.test/orders',
        });
        expect(requestsStore.getState().pendings[resource]).toBeDefined();
        expect(notify).toHaveBeenCalledWith(
            expect.objectContaining({ title: 'Request filled from curl', tone: 'success' }),
        );
        expect(screen.queryByRole('dialog', { name: 'Import a document' })).toBeNull();
    });

    it('asks nothing of a text that is not a curl command, and the import stays', () => {
        const fromCurl = vi.spyOn(syncBridge.codegen, 'fromCurl');
        const notify = openAsRequest('https://example.test');

        expect(fromCurl).not.toHaveBeenCalled();
        expect(notify).toHaveBeenCalledWith(expect.objectContaining({ tone: 'warning' }));
        expect(openTabs()).toEqual([]);
        expect(screen.getByRole('dialog', { name: 'Import a document' })).toBeDefined();
    });

    it('opens nothing when the command cannot be read (useCurlReader)', async () => {
        vi.spyOn(syncBridge.codegen, 'fromCurl').mockResolvedValue(
            failure('unknown', 'main fell over'),
        );

        const notify = openAsRequest(CURL);

        await waitFor(() => {
            expect(notify).toHaveBeenCalledTimes(1);
        });

        expect(openTabs()).toEqual([]);
    });
});
