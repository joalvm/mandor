import { failure, success, type CookieRow } from '@mandor/ipc';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { syncBridge } from '../../../../src/renderer/app/sync-bridge.js';
import { useCookieJar } from '../../../../src/renderer/features/cookies/hooks/useCookieJar.js';
import { AppProviders } from '../../support/app-providers.js';

const PLACE = { environmentId: null, workspaceId: 'demo' };
const SID: CookieRow = {
    domain: 'api.example.com',
    path: '/',
    name: 'sid',
    value: 'abc',
    expires: null,
    httpOnly: false,
    secure: false,
    sameSite: null,
};

beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(syncBridge.cookies, 'list').mockResolvedValue(success({ cookies: [SID] }));
});

afterEach(cleanup);

function openJar() {
    return renderHook(() => useCookieJar(PLACE), { wrapper: AppProviders });
}

describe('the hook of the jar', () => {
    it('has nothing until main answers, then what the jar holds', async () => {
        const { result } = openJar();

        expect(result.current.cookies).toBeNull();

        await waitFor(() => {
            expect(result.current.cookies).toEqual([SID]);
        });
    });

    it('changes a value through main and reads the jar again', async () => {
        const set = vi.spyOn(syncBridge.cookies, 'set').mockResolvedValue(success({}));
        const { result } = openJar();

        await waitFor(() => {
            expect(result.current.cookies).not.toBeNull();
        });
        vi.spyOn(syncBridge.cookies, 'list').mockResolvedValue(
            success({ cookies: [{ ...SID, value: 'new' }] }),
        );
        await act(() => result.current.save(SID, 'new'));

        expect(set).toHaveBeenCalledWith({
            ...PLACE,
            domain: 'api.example.com',
            name: 'sid',
            path: '/',
            value: 'new',
        });
        expect(result.current.cookies?.[0]?.value).toBe('new');
    });

    it('keeps the list as it was when main refuses a write', async () => {
        vi.spyOn(syncBridge.cookies, 'set').mockResolvedValue(failure('bad-request', 'no'));

        const { result } = openJar();

        await waitFor(() => {
            expect(result.current.cookies).toEqual([SID]);
        });
        await act(() => result.current.save(SID, 'a;b'));

        expect(result.current.cookies).toEqual([SID]);
    });
});
