import { failure, success, type CookieRow } from '@mandor/ipc';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { syncBridge } from '../../../../src/renderer/app/sync-bridge.js';
import { CookieJarDialog } from '../../../../src/renderer/features/cookies/components/dialog/CookieJarDialog.js';
import { AppProviders } from '../../support/app-providers.js';

const PLACE = { environmentId: 'staging', workspaceId: 'demo' };
const SID: CookieRow = {
    domain: 'api.example.com',
    path: '/',
    name: 'sid',
    value: 'abc',
    expires: null,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
};
const THEME: CookieRow = { ...SID, name: 'theme', path: '/app', value: 'dark' };

const writeText = vi.fn<(text: string) => Promise<void>>();

beforeEach(() => {
    vi.restoreAllMocks();
    writeText.mockReset().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    vi.spyOn(syncBridge.cookies, 'list').mockResolvedValue(success({ cookies: [SID, THEME] }));
});

afterEach(cleanup);

/** The line of the table that holds a cookie of the jar, once main has listed it. */
async function rowOf(name: string): Promise<HTMLElement> {
    const row = (await screen.findByText(name)).closest('tr');

    if (row === null) {
        throw new Error(`No line for ${name}`);
    }

    return row;
}

function openJar(): void {
    render(<CookieJarDialog onClose={() => undefined} {...PLACE} />, { wrapper: AppProviders });
}

describe('the jar of the environment', () => {
    it('lists every cookie with what identifies it and its value', async () => {
        openJar();

        const sid = await rowOf('sid');

        expect(syncBridge.cookies.list).toHaveBeenCalledWith(PLACE);
        expect(within(sid).getByText('api.example.com/')).toBeVisible();
        expect(within(await rowOf('theme')).getByText('dark')).toBeVisible();
    });

    it('says it is empty, and cannot be emptied, while it holds nothing', async () => {
        vi.spyOn(syncBridge.cookies, 'list').mockResolvedValue(success({ cookies: [] }));

        openJar();

        expect(await screen.findByText('No cookies')).toBeVisible();
        expect(screen.getByRole('button', { name: 'Empty jar…' })).toBeDisabled();
    });

    it('says why in a notice when main refuses to list it', async () => {
        vi.spyOn(syncBridge.cookies, 'list').mockResolvedValue(failure('bad-request', 'none'));

        openJar();

        await waitFor(() => {
            expect(screen.getByText('The operation received invalid data.')).toBeVisible();
        });
    });

    it('shows the jar of the environment asked for last, whichever read answers last', async () => {
        const answers = new Map<string | null, (cookies: CookieRow[]) => void>();

        vi.spyOn(syncBridge.cookies, 'list').mockImplementation(
            ({ environmentId }) =>
                new Promise((resolve) => {
                    answers.set(environmentId, (cookies) => {
                        resolve(success({ cookies }));
                    });
                }),
        );

        const { rerender } = render(<CookieJarDialog onClose={() => undefined} {...PLACE} />, {
            wrapper: AppProviders,
        });

        rerender(
            <CookieJarDialog onClose={() => undefined} {...PLACE} environmentId="production" />,
        );
        answers.get('production')?.([THEME]);
        await rowOf('theme');
        answers.get('staging')?.([SID]);
        await act(() => Promise.resolve());

        expect(screen.queryByText('sid')).toBeNull();
    });

    it('copies the value of a cookie and no other', async () => {
        openJar();

        const theme = await rowOf('theme');

        fireEvent.click(within(theme).getByRole('button', { name: 'Copy value' }));

        await waitFor(() => {
            expect(writeText).toHaveBeenCalledWith('dark');
        });
    });

    it('deletes one cookie and reads the jar again once main says yes', async () => {
        const remove = vi.spyOn(syncBridge.cookies, 'delete').mockResolvedValue(success({}));

        openJar();

        const sid = await rowOf('sid');

        vi.spyOn(syncBridge.cookies, 'list').mockResolvedValue(success({ cookies: [THEME] }));
        fireEvent.click(within(sid).getByRole('button', { name: 'Delete cookie' }));

        await waitFor(() => {
            expect(screen.queryByText('sid')).toBeNull();
        });
        expect(remove).toHaveBeenCalledWith({
            ...PLACE,
            domain: 'api.example.com',
            name: 'sid',
            path: '/',
        });
    });

    it('keeps the row, and says why, when a delete is refused', async () => {
        vi.spyOn(syncBridge.cookies, 'delete').mockResolvedValue(failure('fs-write', 'locked'));

        openJar();

        const sid = await rowOf('sid');

        fireEvent.click(within(sid).getByRole('button', { name: 'Delete cookie' }));

        expect(await screen.findByText('Mandor could not save the requested file.')).toBeVisible();
        expect(screen.getByText('sid')).toBeVisible();
    });

    it('asks before it empties the jar, and keeps it when the answer is no', async () => {
        const clear = vi.spyOn(syncBridge.cookies, 'clear').mockResolvedValue(success({}));

        openJar();
        await rowOf('sid');
        fireEvent.click(screen.getByRole('button', { name: 'Empty jar…' }));

        expect(screen.getByText('Empty the jar?')).toBeVisible();

        fireEvent.click(screen.getByRole('button', { name: 'Keep' }));

        expect(clear).not.toHaveBeenCalled();
    });

    it('empties the jar of this environment after the question', async () => {
        const clear = vi.spyOn(syncBridge.cookies, 'clear').mockResolvedValue(success({}));

        openJar();
        await rowOf('sid');
        vi.spyOn(syncBridge.cookies, 'list').mockResolvedValue(success({ cookies: [] }));
        fireEvent.click(screen.getByRole('button', { name: 'Empty jar…' }));
        fireEvent.click(screen.getByRole('button', { name: 'Empty jar' }));

        expect(await screen.findByText('No cookies')).toBeVisible();
        expect(clear).toHaveBeenCalledWith(PLACE);
    });
});
