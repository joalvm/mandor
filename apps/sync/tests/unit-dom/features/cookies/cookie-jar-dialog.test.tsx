import { failure, success, type CookieRow } from '@mandor/ipc';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { syncBridge } from '../../../../src/renderer/app/sync-bridge.js';
import { CookieJarDialog } from '../../../../src/renderer/features/cookies/components/dialog/CookieJarDialog.js';
import { AppProviders } from '../../support/app-providers.js';

// The dialog is mounted whole: CookieDomainForm, CookieDomainList, CookieDomainGroup and
// CookieChip are read through it, and so is the scope useCookieJarScope hands them.

const PLACE = { environmentId: 'staging', workspaceId: 'demo' };
const SID: CookieRow = {
    line: 'sid=abc; Domain=api.example.com; Path=/; Secure; HttpOnly; SameSite=Lax',
    domain: 'api.example.com',
    path: '/',
    name: 'sid',
    value: 'abc',
    expires: null,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
};
const THEME: CookieRow = { ...SID, line: 'theme=dark; Path=/app', name: 'theme', path: '/app' };
const TOKEN: CookieRow = { ...SID, domain: 'auth.test', line: 'token=t; Path=/', name: 'token' };

beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(syncBridge.cookies, 'list').mockResolvedValue(
        success({ cookies: [SID, THEME, TOKEN] }),
    );
});

afterEach(cleanup);

/** The group of one domain, once main has listed the jar. */
async function groupOf(domain: string): Promise<HTMLElement> {
    const group = (await screen.findByRole('heading', { name: domain })).closest('li');

    if (group === null) {
        throw new Error(`No group for ${domain}`);
    }

    return group;
}

function openJar(): void {
    render(<CookieJarDialog onClose={() => undefined} {...PLACE} />, { wrapper: AppProviders });
}

function listNext(cookies: CookieRow[]): void {
    vi.spyOn(syncBridge.cookies, 'list').mockResolvedValue(success({ cookies }));
}

describe('the domains of the jar', () => {
    it('groups the cookies of the environment by domain, each with its count and names', async () => {
        openJar();

        const api = await groupOf('api.example.com');

        expect(syncBridge.cookies.list).toHaveBeenCalledWith(PLACE);
        expect(within(api).getByText('2 cookies')).toBeVisible();
        expect(within(api).getByRole('button', { name: 'sid' })).toBeVisible();
        expect(within(api).getByRole('button', { name: 'theme' })).toBeVisible();
        expect(within(await groupOf('auth.test')).getByText('1 cookie')).toBeVisible();
    });

    it('says it is empty, and cannot be cleared, while it holds nothing', async () => {
        listNext([]);
        openJar();

        expect(await screen.findByText('No cookies')).toBeVisible();
        expect(screen.getByRole('button', { name: 'Clear all…' })).toBeDisabled();
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
        answers.get('production')?.([TOKEN]);
        await groupOf('auth.test');
        answers.get('staging')?.([SID]);
        await act(() => Promise.resolve());

        expect(screen.queryByRole('heading', { name: 'api.example.com' })).toBeNull();
    });

    it('narrows the domains to what the field says, and says when none holds it', async () => {
        openJar();
        await groupOf('auth.test');

        fireEvent.input(screen.getByRole('textbox', { name: 'Domain' }), {
            target: { textContent: 'https://auth.test/login' },
        });

        expect(screen.queryByRole('heading', { name: 'api.example.com' })).toBeNull();
        expect(screen.getByRole('heading', { name: 'auth.test' })).toBeVisible();

        fireEvent.input(screen.getByRole('textbox', { name: 'Domain' }), {
            target: { textContent: 'nowhere' },
        });

        expect(screen.getByText('No domain holds that text.')).toBeVisible();
    });

    it('adds a domain from a pasted URL, empty, ready for a first cookie', async () => {
        openJar();
        await groupOf('auth.test');
        fireEvent.input(screen.getByRole('textbox', { name: 'Domain' }), {
            target: { textContent: 'https://new.test/a' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Add domain' }));

        const added = await groupOf('new.test');

        expect(within(added).getByText('0 cookies')).toBeVisible();
        expect(within(added).getByRole('button', { name: 'Add cookie' })).toBeVisible();
    });
});

describe('deleting from the jar', () => {
    it('deletes one cookie by its cross and reads the jar again once main says yes', async () => {
        const remove = vi.spyOn(syncBridge.cookies, 'delete').mockResolvedValue(success({}));

        openJar();

        const api = await groupOf('api.example.com');

        listNext([THEME, TOKEN]);
        fireEvent.click(within(api).getByRole('button', { name: 'Delete sid' }));

        await waitFor(() => {
            expect(screen.queryByRole('button', { name: 'sid' })).toBeNull();
        });
        expect(remove).toHaveBeenCalledWith({
            ...PLACE,
            domain: 'api.example.com',
            name: 'sid',
            path: '/',
        });
    });

    it('keeps the cookie, and says why, when a delete is refused', async () => {
        vi.spyOn(syncBridge.cookies, 'delete').mockResolvedValue(failure('fs-write', 'locked'));

        openJar();
        fireEvent.click(
            within(await groupOf('api.example.com')).getByRole('button', { name: 'Delete sid' }),
        );

        expect(await screen.findByText('Mandor could not save the requested file.')).toBeVisible();
        expect(screen.getByRole('button', { name: 'sid' })).toBeVisible();
    });

    it('deletes every cookie of one domain and leaves the others', async () => {
        const clear = vi.spyOn(syncBridge.cookies, 'clear').mockResolvedValue(success({}));

        openJar();
        await groupOf('auth.test');
        listNext([TOKEN]);
        fireEvent.click(
            screen.getByRole('button', { name: 'Delete the cookies of api.example.com' }),
        );

        await waitFor(() => {
            expect(screen.queryByRole('heading', { name: 'api.example.com' })).toBeNull();
        });
        expect(clear).toHaveBeenCalledWith({ ...PLACE, domain: 'api.example.com' });
        expect(screen.getByRole('heading', { name: 'auth.test' })).toBeVisible();
    });

    it('forgets a domain added in the dialog without asking main', async () => {
        const clear = vi.spyOn(syncBridge.cookies, 'clear');

        openJar();
        await groupOf('auth.test');
        fireEvent.input(screen.getByRole('textbox', { name: 'Domain' }), {
            target: { textContent: 'new.test' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Add domain' }));
        fireEvent.click(screen.getByRole('button', { name: 'Delete the cookies of new.test' }));

        expect(screen.queryByRole('heading', { name: 'new.test' })).toBeNull();
        expect(clear).not.toHaveBeenCalled();
    });

    it('asks before it clears the jar, and keeps it when the answer is no', async () => {
        const clear = vi.spyOn(syncBridge.cookies, 'clear').mockResolvedValue(success({}));

        openJar();
        await groupOf('auth.test');
        fireEvent.click(screen.getByRole('button', { name: 'Clear all…' }));

        expect(screen.getByText('Clear every cookie?')).toBeVisible();

        fireEvent.click(screen.getByRole('button', { name: 'Keep' }));

        expect(clear).not.toHaveBeenCalled();
    });

    it('clears the whole jar of this environment after the question', async () => {
        const clear = vi.spyOn(syncBridge.cookies, 'clear').mockResolvedValue(success({}));

        openJar();
        await groupOf('auth.test');
        listNext([]);
        fireEvent.click(screen.getByRole('button', { name: 'Clear all…' }));
        fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));

        expect(await screen.findByText('No cookies')).toBeVisible();
        expect(clear).toHaveBeenCalledWith(PLACE);
    });
});
