import { failure, success, type CookieRow } from '@mandor/ipc';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { syncBridge } from '../../../../src/renderer/app/sync-bridge.js';
import { useCookieJar } from '../../../../src/renderer/features/cookies/hooks/useCookieJar.js';
import { AppProviders } from '../../support/app-providers.js';

const PLACE = { environmentId: null, workspaceId: 'demo' };
const SID: CookieRow = {
    line: 'sid=abc; Path=/',
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

    it('writes a line over the cookie it replaces through main and reads the jar again', async () => {
        const set = vi.spyOn(syncBridge.cookies, 'set').mockResolvedValue(success({}));
        const { result } = openJar();
        const replaces = { domain: 'api.example.com', name: 'sid', path: '/' };

        await waitFor(() => {
            expect(result.current.cookies).not.toBeNull();
        });
        vi.spyOn(syncBridge.cookies, 'list').mockResolvedValue(
            success({ cookies: [{ ...SID, value: 'new' }] }),
        );

        const kept = await act(() =>
            result.current.put('api.example.com', 'sid=new; Path=/', replaces),
        );

        expect(kept).toBe(true);
        expect(set).toHaveBeenCalledWith({
            ...PLACE,
            domain: 'api.example.com',
            line: 'sid=new; Path=/',
            replaces,
        });
        expect(result.current.cookies?.[0]?.value).toBe('new');
    });

    it('answers that a refused line was not kept, and keeps the list as it was', async () => {
        vi.spyOn(syncBridge.cookies, 'set').mockResolvedValue(failure('bad-request', 'no'));

        const { result } = openJar();

        await waitFor(() => {
            expect(result.current.cookies).toEqual([SID]);
        });

        expect(await act(() => result.current.put('api.example.com', 'a b'))).toBe(false);

        expect(result.current.cookies).toEqual([SID]);
    });

    it('answers that a write failed when main cannot keep it', async () => {
        vi.spyOn(syncBridge.cookies, 'set').mockResolvedValue(failure('fs-write', 'locked'));

        const { result } = openJar();

        await waitFor(() => {
            expect(result.current.cookies).toEqual([SID]);
        });

        expect(await act(() => result.current.put('api.example.com', 'sid=x'))).toBe(false);
    });

    it('takes the cookies of one domain out through main', async () => {
        const clear = vi.spyOn(syncBridge.cookies, 'clear').mockResolvedValue(success({}));
        const { result } = openJar();

        await waitFor(() => {
            expect(result.current.cookies).toEqual([SID]);
        });
        vi.spyOn(syncBridge.cookies, 'list').mockResolvedValue(success({ cookies: [] }));
        await act(() => result.current.clearDomain('api.example.com'));

        expect(clear).toHaveBeenCalledWith({ ...PLACE, domain: 'api.example.com' });
        expect(result.current.cookies).toEqual([]);
    });
});
