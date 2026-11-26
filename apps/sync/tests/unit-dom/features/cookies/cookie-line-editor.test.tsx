import { failure, success, type CookieRow } from '@mandor/ipc';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { syncBridge } from '../../../../src/renderer/app/sync-bridge.js';
import { CookieJarDialog } from '../../../../src/renderer/features/cookies/components/dialog/CookieJarDialog.js';
import { AppProviders } from '../../support/app-providers.js';

// CookieLineEditor opens under the chips of its domain; the dialog is mounted whole around it.

const PLACE = { environmentId: null, workspaceId: 'demo' };
const SID_LINE = 'sid=abc; Path=/; HttpOnly';
const SID: CookieRow = {
    line: SID_LINE,
    domain: 'api.example.com',
    path: '/',
    name: 'sid',
    value: 'abc',
    expires: null,
    httpOnly: true,
    secure: false,
    sameSite: null,
};

beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(syncBridge.cookies, 'list').mockResolvedValue(success({ cookies: [SID] }));
});

afterEach(cleanup);

async function openJar(): Promise<void> {
    render(<CookieJarDialog onClose={() => undefined} {...PLACE} />, { wrapper: AppProviders });
    await screen.findByRole('button', { name: 'sid' });
}

function lineField(): HTMLElement {
    return screen.getByRole('textbox', { name: 'Cookie of api.example.com' });
}

describe('the line of a cookie', () => {
    it('opens as the Set-Cookie line a server would send, and closes on cancel', async () => {
        await openJar();
        fireEvent.click(screen.getByRole('button', { name: 'sid' }));

        expect(lineField()).toHaveValue(SID_LINE);
        expect(screen.getByRole('button', { name: 'sid' })).toHaveAttribute('aria-pressed', 'true');

        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

        expect(screen.queryByRole('textbox', { name: 'Cookie of api.example.com' })).toBeNull();
    });

    it('saves an edited line over the cookie it was opened from, then closes', async () => {
        const set = vi.spyOn(syncBridge.cookies, 'set').mockResolvedValue(success({}));

        await openJar();
        fireEvent.click(screen.getByRole('button', { name: 'sid' }));
        fireEvent.change(lineField(), { target: { value: 'sid=new; Path=/' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));

        await waitFor(() => {
            expect(screen.queryByRole('textbox', { name: 'Cookie of api.example.com' })).toBeNull();
        });
        expect(set).toHaveBeenCalledWith({
            ...PLACE,
            domain: 'api.example.com',
            line: 'sid=new; Path=/',
            replaces: { domain: 'api.example.com', name: 'sid', path: '/' },
        });
    });

    it('stays open and says why when the line is no cookie of the domain', async () => {
        vi.spyOn(syncBridge.cookies, 'set').mockResolvedValue(failure('bad-request', 'no'));

        await openJar();
        fireEvent.click(screen.getByRole('button', { name: 'sid' }));
        fireEvent.change(lineField(), { target: { value: 'not a cookie' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));

        expect(
            await screen.findByText(
                'Mandor could not read this line as a cookie of api.example.com.',
            ),
        ).toBeVisible();
        expect(lineField()).toHaveValue('not a cookie');
    });

    it('keeps the line open, with a notice, when main cannot write it', async () => {
        vi.spyOn(syncBridge.cookies, 'set').mockResolvedValue(failure('fs-write', 'locked'));

        await openJar();
        fireEvent.click(screen.getByRole('button', { name: 'sid' }));
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));

        expect(await screen.findByText('Mandor could not save the requested file.')).toBeVisible();
        expect(lineField()).toHaveValue(SID_LINE);
    });

    it('closes the line of a cookie deleted by its cross', async () => {
        vi.spyOn(syncBridge.cookies, 'delete').mockResolvedValue(success({}));

        await openJar();
        fireEvent.click(screen.getByRole('button', { name: 'sid' }));
        vi.spyOn(syncBridge.cookies, 'list').mockResolvedValue(success({ cookies: [] }));
        fireEvent.click(screen.getByRole('button', { name: 'Delete sid' }));

        expect(screen.queryByRole('textbox', { name: 'Cookie of api.example.com' })).toBeNull();
        expect(await screen.findByText('No cookies')).toBeVisible();
    });
});

describe('a new cookie', () => {
    it('starts from the first free name of the domain and is written as a new one', async () => {
        const set = vi.spyOn(syncBridge.cookies, 'set').mockResolvedValue(success({}));

        await openJar();
        fireEvent.click(screen.getByRole('button', { name: 'Add cookie' }));

        expect(lineField()).toHaveDisplayValue(/^Cookie_1=value; Path=\/; Expires=/u);

        fireEvent.click(screen.getByRole('button', { name: 'Save' }));

        await waitFor(() => {
            expect(screen.queryByRole('textbox', { name: 'Cookie of api.example.com' })).toBeNull();
        });
        expect(set).toHaveBeenCalledOnce();
        expect(set.mock.calls[0]?.[0].replaces).toBeUndefined();
    });

    it('writes the first cookie of a domain added in the dialog under that domain', async () => {
        const set = vi.spyOn(syncBridge.cookies, 'set').mockResolvedValue(success({}));

        await openJar();
        fireEvent.input(screen.getByRole('textbox', { name: 'Domain' }), {
            target: { textContent: 'new.test' },
        });
        fireEvent.keyDown(screen.getByRole('textbox', { name: 'Domain' }), { key: 'Enter' });

        const added = (await screen.findByRole('heading', { name: 'new.test' })).closest('li');

        if (added === null) {
            throw new Error('No group for new.test');
        }

        fireEvent.click(within(added).getByRole('button', { name: 'Add cookie' }));
        fireEvent.change(screen.getByRole('textbox', { name: 'Cookie of new.test' }), {
            target: { value: 'first=1' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));

        await waitFor(() => {
            expect(screen.queryByRole('textbox', { name: 'Cookie of new.test' })).toBeNull();
        });
        expect(set).toHaveBeenCalledWith(
            expect.objectContaining({ domain: 'new.test', line: 'first=1' }),
        );
    });
});
