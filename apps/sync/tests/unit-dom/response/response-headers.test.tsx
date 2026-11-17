import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ResponseCookies } from '../../../src/renderer/response/ResponseCookies.js';
import { ResponseHeaders } from '../../../src/renderer/response/ResponseHeaders.js';
import { ResponseTable } from '../../../src/renderer/response/ResponseTable.js';
import { ResponseTableRow } from '../../../src/renderer/response/ResponseTableRow.js';
import { AppProviders } from '../support/app-providers.js';
import { stubClipboard } from '../support/http-response.js';

const HEADERS: [string, string][] = [
    ['content-type', 'application/json'],
    ['set-cookie', 'a=1'],
    ['set-cookie', 'b=2'],
];

const writeText = vi.fn<(text: string) => Promise<void>>();

beforeEach(() => {
    writeText.mockReset().mockResolvedValue(undefined);
    stubClipboard(writeText);
});

afterEach(cleanup);

function bodyRows(): HTMLElement[] {
    return within(screen.getByRole('table')).getAllByRole('row').slice(1);
}

describe('the headers of a response', () => {
    /** The same table as the headers of a request, without the ways to write them. */
    it('keeps the copy of all of them in the head of the table', () => {
        render(<ResponseHeaders headers={HEADERS} />, { wrapper: AppProviders });

        const head = screen.getByRole('columnheader', { name: /Actions/ });

        expect(within(head).getByRole('button', { name: 'Copy all' })).toBeVisible();
        expect(screen.getByRole('table', { name: 'Headers' })).toBeVisible();
    });

    it('lists them in the order they arrived, repeated names included', () => {
        render(<ResponseHeaders headers={HEADERS} />, { wrapper: AppProviders });

        const rows = bodyRows().map((row) => row.textContent);

        expect(rows).toHaveLength(3);
        expect(rows[0]).toContain('content-type');
        expect(rows[1]).toContain('set-cookie');
        expect(rows[2]).toContain('b=2');
    });

    it('copies the line of the header whose button was pressed, and says so', async () => {
        render(<ResponseHeaders headers={HEADERS} />, { wrapper: AppProviders });

        fireEvent.click(
            within(bodyRows().slice(0, 1)[0] ?? document.body).getByRole('button', {
                name: 'Copy',
            }),
        );

        expect(writeText).toHaveBeenCalledWith('content-type: application/json');
        await waitFor(() => {
            expect(screen.getByText('Copied')).toBeVisible();
        });
    });

    it('copies all of them, one to a line', async () => {
        render(<ResponseHeaders headers={HEADERS} />, { wrapper: AppProviders });

        fireEvent.click(screen.getByRole('button', { name: 'Copy all' }));

        expect(writeText).toHaveBeenCalledWith(
            'content-type: application/json\nset-cookie: a=1\nset-cookie: b=2',
        );
        expect(await screen.findByText('Copied')).toBeVisible();
    });

    it('says why when the clipboard refuses', async () => {
        writeText.mockRejectedValue(new Error('denied'));
        render(<ResponseHeaders headers={HEADERS} />, { wrapper: AppProviders });

        fireEvent.click(screen.getByRole('button', { name: 'Copy all' }));

        await waitFor(() => {
            expect(screen.getByText('Mandor could not complete the operation.')).toBeVisible();
        });
    });
});

describe('the table of a response', () => {
    it('names its columns and holds the attributes one only when asked', () => {
        const rows = [{ attributes: 'Secure', copy: 'a=1', name: 'a', value: '1' }];

        const { rerender } = render(
            <ResponseTable label="Cookies" onCopy={vi.fn()} rows={rows} />,
            {
                wrapper: AppProviders,
            },
        );

        expect(screen.queryByRole('columnheader', { name: 'Attributes' })).toBeNull();

        rerender(<ResponseTable label="Cookies" onCopy={vi.fn()} rows={rows} showAttributes />);

        expect(screen.getByRole('columnheader', { name: 'Attributes' })).toBeVisible();
        expect(screen.getByText('Secure')).toBeVisible();
    });

    it('hands the text of a line to whoever copies', () => {
        const onCopy = vi.fn();

        render(
            <table>
                <tbody>
                    <ResponseTableRow
                        onCopy={onCopy}
                        row={{ copy: 'x=1', name: 'x', value: '1' }}
                        showAttributes={false}
                    />
                </tbody>
            </table>,
            { wrapper: AppProviders },
        );
        fireEvent.click(screen.getByRole('button', { name: 'Copy' }));

        expect(onCopy).toHaveBeenCalledWith('x=1');
    });
});

describe('the cookies of a response', () => {
    it('shows each one with the attributes its line carried, and copies it as a pair', async () => {
        render(
            <ResponseCookies
                cookies={[
                    {
                        domain: 'api.test',
                        httpOnly: true,
                        name: 'sid',
                        path: '/',
                        secure: true,
                        value: 'abc',
                    },
                ]}
            />,
            { wrapper: AppProviders },
        );

        expect(screen.getByText('Domain=api.test; Path=/; Secure; HttpOnly')).toBeVisible();

        fireEvent.click(screen.getByRole('button', { name: 'Copy' }));

        expect(writeText).toHaveBeenCalledWith('sid=abc');
        expect(await screen.findByText('Copied')).toBeVisible();
    });

    it('says a response set none instead of drawing an empty table', () => {
        render(<ResponseCookies cookies={[]} />, { wrapper: AppProviders });

        expect(screen.getByText('No cookies')).toBeVisible();
        expect(screen.queryByRole('table')).toBeNull();
    });
});
