import { success } from '@mandor/ipc';
import { cleanup, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { syncBridge } from '../../../src/renderer/app/sync-bridge.js';
import { useSaveBody } from '../../../src/renderer/response/hooks/useSaveBody.js';
import { AppProviders } from '../support/app-providers.js';
import { httpResponseWith, textBody } from '../support/http-response.js';

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
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
