import { ItemProvider, itemResource } from '@mandor/collections';
import { envStore } from '@mandor/env';
import { success } from '@mandor/ipc';
import type { CurlParse } from '@mandor/schema';
import { shellStore } from '@mandor/shell';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { syncBridge } from '../../../../src/renderer/app/sync-bridge.js';
import { RequestPanel } from '../../../../src/renderer/features/requests/components/panel/RequestPanel.js';
import { requestsStore } from '../../../../src/renderer/features/requests/index.js';
import { AppProviders } from '../../support/app-providers.js';
import { stubClipboard } from '../../support/http-response.js';

// useRequestCode.ts, through the panel like every consumer.
const RESOURCE = itemResource('Local', 'local', 'crear-pedido');

const BODY = { kind: 'request', method: 'GET', name: 'crear pedido', url: 'http://localhost/a' };

const PARSED: CurlParse = {
    kind: 'parsed',
    request: {
        method: 'POST',
        url: 'http://api.test/orders',
        query: [],
        headers: [],
        body: { type: 'none' },
        settings: {},
    },
    notices: [],
};

function draw(): void {
    render(
        <ItemProvider value={{ resource: RESOURCE, saved: undefined }}>
            <RequestPanel />
        </ItemProvider>,
        { wrapper: AppProviders },
    );
}

/**
 * The copy glyph once the code is written. It is asked for again each time: its tooltip changes
 * when it turns on, and the button it held before is not the one on screen.
 */
async function enabledCopy(): Promise<HTMLElement> {
    return waitFor(() => {
        const copy = screen.getByRole('button', { name: 'Copy' });

        expect(copy).toBeEnabled();

        return copy;
    });
}

describe('the curl and the code of the panel of a request', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        shellStore.getState().reset();
        shellStore.getState().setOrigins([{ id: 'local', name: 'Local', kind: 'local' }]);
        shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'local' });
        requestsStore.getState().reset();
        vi.spyOn(window.mandor.collections, 'readItem').mockResolvedValue(success(BODY));
    });

    afterEach(() => {
        cleanup();
        envStore.getState().reset();
        requestsStore.getState().reset();
        shellStore.getState().reset();
    });

    it('fills the request with a curl pasted into the url, and writes no text into the field', async () => {
        draw();
        const fromCurl = vi
            .spyOn(syncBridge.codegen, 'fromCurl')
            .mockResolvedValue(success(PARSED));

        const url = await screen.findByRole('textbox', { name: 'URL' });

        fireEvent.paste(url, {
            clipboardData: { getData: () => 'curl -X POST http://api.test/orders' },
        });

        await waitFor(() => {
            expect(url).toHaveTextContent('http://api.test/orders');
        });
        expect(fromCurl).toHaveBeenCalledWith({ text: 'curl -X POST http://api.test/orders' });
        expect(await screen.findByText('Request filled from curl')).toBeVisible();
    });

    it('pastes any other text into the url as always', async () => {
        draw();
        const fromCurl = vi.spyOn(syncBridge.codegen, 'fromCurl');
        const url = await screen.findByRole('textbox', { name: 'URL' });

        fireEvent.paste(url, { clipboardData: { getData: () => '/extra' } });

        expect(url).toHaveTextContent('http://localhost/a/extra');
        expect(fromCurl).not.toHaveBeenCalled();
    });

    it('opens the request as code in cURL, and copies what the dialog shows', async () => {
        draw();
        const writeText = vi.fn(() => Promise.resolve());
        const snippet = vi
            .spyOn(syncBridge.codegen, 'snippet')
            .mockResolvedValue(success({ code: "curl 'http://localhost/a'", leftOutFile: null }));

        stubClipboard(writeText);
        fireEvent.click(await screen.findByRole('button', { name: 'Code' }));

        expect(await screen.findByRole('dialog', { name: 'Request as code' })).toBeVisible();

        const copy = await enabledCopy();

        expect(snippet).toHaveBeenCalledWith(expect.objectContaining({ target: 'curl' }));

        fireEvent.click(copy);

        await waitFor(() => {
            expect(writeText).toHaveBeenCalledWith("curl 'http://localhost/a'");
        });
        expect(await screen.findByText('Code copied')).toBeVisible();
    });

    it('asks again when another language is picked', async () => {
        draw();
        const snippet = vi
            .spyOn(syncBridge.codegen, 'snippet')
            .mockResolvedValue(success({ code: 'x', leftOutFile: null }));

        fireEvent.click(await screen.findByRole('button', { name: 'Code' }));
        await screen.findByRole('dialog', { name: 'Request as code' });

        fireEvent.keyDown(screen.getByRole('combobox', { name: 'Language' }), {
            code: 'ArrowDown',
            key: 'ArrowDown',
        });
        fireEvent.click(await screen.findByRole('option', { name: 'JavaScript fetch' }));

        await waitFor(() => {
            expect(snippet).toHaveBeenLastCalledWith(
                expect.objectContaining({ target: 'js-fetch' }),
            );
        });
    });

    it('says so when the clipboard refuses the code', async () => {
        draw();
        vi.spyOn(syncBridge.codegen, 'snippet').mockResolvedValue(
            success({ code: 'x', leftOutFile: null }),
        );
        stubClipboard(() => Promise.reject(new Error('denied')));

        fireEvent.click(await screen.findByRole('button', { name: 'Code' }));

        fireEvent.click(await enabledCopy());

        expect(await screen.findByText('The code could not be copied')).toBeVisible();
    });
});
