import { success } from '@mandor/ipc';
import { cleanup, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { syncBridge } from '../../../src/renderer/app/sync-bridge.js';
import { useCopyText } from '../../../src/renderer/response/hooks/useCopyText.js';
import { useSaveBody } from '../../../src/renderer/response/hooks/useSaveBody.js';
import { AppProviders } from '../support/app-providers.js';
import { httpResponseWith, stubClipboard, textBody } from '../support/http-response.js';

const writeText = vi.fn<(text: string) => Promise<void>>();

beforeEach(() => {
    writeText.mockReset().mockResolvedValue(undefined);
    stubClipboard(writeText);
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe('useCopyText', () => {
    it('puts the text on the clipboard and says it did', async () => {
        const { result } = renderHook(() => useCopyText(), { wrapper: AppProviders });

        result.current('hola');

        expect(writeText).toHaveBeenCalledWith('hola');
        await waitFor(() => {
            expect(screen.getByText('Copied')).toBeVisible();
        });
    });

    it('says it could not when the clipboard refuses', async () => {
        writeText.mockRejectedValue(new Error('denied'));
        const { result } = renderHook(() => useCopyText(), { wrapper: AppProviders });

        result.current('hola');

        await waitFor(() => {
            expect(screen.getByText('Mandor could not complete the operation.')).toBeVisible();
        });
    });
});

describe('useSaveBody', () => {
    const response = httpResponseWith({ body: textBody('hola') });

    it('says the body was saved', async () => {
        vi.spyOn(syncBridge.request, 'saveBody').mockResolvedValue(success({ path: 'C:/x/a.txt' }));
        const { result } = renderHook(() => useSaveBody(response, 'text'), {
            wrapper: AppProviders,
        });

        result.current();

        await waitFor(() => {
            expect(screen.getByText('Saved')).toBeVisible();
        });
    });

    it('says nothing when the dialog was closed', async () => {
        const save = vi
            .spyOn(syncBridge.request, 'saveBody')
            .mockResolvedValue(success({ path: null }));
        const { result } = renderHook(() => useSaveBody(response, 'text'), {
            wrapper: AppProviders,
        });

        result.current();

        await waitFor(() => {
            expect(save).toHaveBeenCalled();
        });
        expect(screen.queryByText('Saved')).toBeNull();
    });
});
