import { itemResource } from '@mandor/collections';
import { failure, success } from '@mandor/ipc';
import { createRequestItem, type CurlParse } from '@mandor/schema';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { syncBridge } from '../../../../src/renderer/app/sync-bridge.js';
import { useCurlPaste } from '../../../../src/renderer/features/requests/hooks/useCurlPaste.js';
import { requestsStore } from '../../../../src/renderer/features/requests/requests-store.js';
import { AppProviders } from '../../support/app-providers.js';

const RESOURCE = itemResource('Local', 'local', 'crear-pedido');
const PREVIOUS = { ...createRequestItem({ name: 'Orders' }), url: 'http://old' };

const PARSED: CurlParse = {
    kind: 'parsed',
    request: {
        method: 'POST',
        url: 'http://api.test/orders',
        query: [],
        headers: [],
        body: { type: 'json', content: '{}' },
        settings: {},
    },
    notices: [],
};

function pasteHook() {
    const notify = vi.fn();
    const { result } = renderHook(() => useCurlPaste(RESOURCE), {
        wrapper: ({ children }: { children: ReactNode }) => (
            <AppProviders onNotify={notify}>{children}</AppProviders>
        ),
    });

    return { notify, paste: result.current };
}

describe('pasting a curl command into the url', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        requestsStore.getState().reset();
        requestsStore.getState().setRequest(RESOURCE, PREVIOUS);
    });

    it('leaves any other text to the field and asks nothing', () => {
        const fromCurl = vi.spyOn(syncBridge.codegen, 'fromCurl');
        const { notify, paste } = pasteHook();

        expect(paste('https://example.test')).toBe(false);
        expect(fromCurl).not.toHaveBeenCalled();
        expect(notify).not.toHaveBeenCalled();
    });

    it('takes the paste, fills the request and says so', async () => {
        const fromCurl = vi
            .spyOn(syncBridge.codegen, 'fromCurl')
            .mockResolvedValue(success(PARSED));
        const { notify, paste } = pasteHook();

        expect(paste('curl -X POST http://api.test/orders')).toBe(true);

        await waitFor(() => {
            expect(notify).toHaveBeenCalledTimes(1);
        });

        expect(fromCurl).toHaveBeenCalledWith({ text: 'curl -X POST http://api.test/orders' });
        expect(requestsStore.getState().requests[RESOURCE]).toMatchObject({
            name: 'Orders',
            method: 'POST',
            url: 'http://api.test/orders',
        });
        expect(notify).toHaveBeenCalledWith(
            expect.objectContaining({ title: 'Request filled from curl', tone: 'success' }),
        );
    });

    it('tells what did not come in, and the tone turns to a warning', async () => {
        vi.spyOn(syncBridge.codegen, 'fromCurl').mockResolvedValue(
            success({
                ...PARSED,
                notices: [
                    { code: 'dataFile', subject: 'a.json' },
                    { code: 'unsupportedOption', subject: '--proxy' },
                ],
            }),
        );
        const { notify, paste } = pasteHook();

        paste('curl x');

        await waitFor(() => {
            expect(notify).toHaveBeenCalledTimes(1);
        });

        expect(notify).toHaveBeenCalledWith(
            expect.objectContaining({
                detail:
                    'The body file a.json cannot be read from here; it is left out. ' +
                    'The option --proxy has no equivalent in Mandor and is ignored.',
                tone: 'warning',
            }),
        );
    });

    it('goes back to the request it replaced with Undo', async () => {
        vi.spyOn(syncBridge.codegen, 'fromCurl').mockResolvedValue(success(PARSED));
        const { notify, paste } = pasteHook();

        paste('curl x');

        await waitFor(() => {
            expect(notify).toHaveBeenCalledTimes(1);
        });

        const { action } = notify.mock.calls[0]?.[0] as {
            action: { label: string; onSelect: () => void };
        };

        expect(action.label).toBe('Undo');

        action.onSelect();

        expect(requestsStore.getState().requests[RESOURCE]).toEqual(PREVIOUS);
    });

    it('does not touch the request for a command it cannot read, and says why', async () => {
        vi.spyOn(syncBridge.codegen, 'fromCurl').mockResolvedValue(
            success({ kind: 'invalid', reason: 'missingArgument', subject: '-H' }),
        );
        const { notify, paste } = pasteHook();

        paste('curl -H');

        await waitFor(() => {
            expect(notify).toHaveBeenCalledTimes(1);
        });

        expect(notify).toHaveBeenCalledWith({
            title: 'The option -H needs a value.',
            tone: 'warning',
        });
        expect(requestsStore.getState().requests[RESOURCE]).toEqual(PREVIOUS);
    });

    it.each([
        [
            'a refusal of main with the text of its code',
            () => Promise.resolve(failure('unknown', 'x')),
        ],
        ['an answer out of contract as an unknown failure', () => Promise.reject(new Error('no'))],
    ])('tells %s', async (_name, answer) => {
        vi.spyOn(syncBridge.codegen, 'fromCurl').mockImplementation(answer);
        const { notify, paste } = pasteHook();

        paste('curl x');

        await waitFor(() => {
            expect(notify).toHaveBeenCalledWith({
                title: 'Mandor could not complete the operation.',
                tone: 'error',
            });
        });
        expect(requestsStore.getState().requests[RESOURCE]).toEqual(PREVIOUS);
    });

    it('changes nothing when the request was closed while main was reading', async () => {
        vi.spyOn(syncBridge.codegen, 'fromCurl').mockImplementation(() => {
            requestsStore.getState().reset();

            return Promise.resolve(success(PARSED));
        });
        const { notify, paste } = pasteHook();

        paste('curl x');

        await waitFor(() => {
            expect(syncBridge.codegen.fromCurl).toHaveBeenCalledTimes(1);
        });
        await Promise.resolve();

        expect(requestsStore.getState().requests[RESOURCE]).toBeUndefined();
        expect(notify).not.toHaveBeenCalled();
    });
});
