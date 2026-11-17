import { httpResponseSchema } from '@mandor/schema';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ResponseSummary } from '../../../src/renderer/response/ResponseSummary.js';
import { AppProviders } from '../support/app-providers.js';

afterEach(cleanup);

function responseOf(
    status: number,
    version: '1.1' | '2' = '2',
    graphqlErrors?: { count: number; messages: string[] },
) {
    return httpResponseSchema.parse({
        status,
        statusText: '',
        httpVersion: version,
        headers: [],
        body: null,
        sizes: { transferredBytes: 900, bodyBytes: 3100, decoded: true },
        timings: {
            dnsMs: 1,
            connectMs: 1,
            tlsMs: 1,
            firstByteMs: 100,
            totalMs: 141.6,
            viaProxy: false,
        },
        redirects: [],
        cookies: [],
        ...(graphqlErrors === undefined ? {} : { graphqlErrors }),
    });
}

describe('the summary of a response', () => {
    it('says the status, how long it took and what it weighed on the wire', () => {
        render(<ResponseSummary response={responseOf(200)} />, { wrapper: AppProviders });

        expect(screen.getByText('200')).toBeVisible();
        expect(screen.getByText('142 ms')).toBeVisible();
        expect(screen.getByText('900 B')).toBeVisible();
    });

    it.each([
        [200, 'success'],
        [301, 'redirect'],
        [404, 'client-error'],
        [503, 'server-error'],
    ] as const)('puts a %i in the family of %s, which colours it', (status, family) => {
        render(<ResponseSummary response={responseOf(status)} />, { wrapper: AppProviders });

        expect(
            screen.getByText(String(status)).closest('[data-part="response-status-pill"]'),
        ).toHaveAttribute('data-family', family);
    });

    it('says the protocol the server spoke when the keyboard rests on the network', async () => {
        render(<ResponseSummary response={responseOf(200, '1.1')} />, { wrapper: AppProviders });

        expect(screen.queryByText('HTTP/1.1')).toBeNull();

        fireEvent.focus(screen.getByRole('button', { name: 'Network' }));

        expect(await screen.findByText('HTTP/1.1')).toBeVisible();

        fireEvent.blur(screen.getByRole('button', { name: 'Network' }));

        await waitFor(() => {
            expect(screen.queryByText('HTTP/1.1')).toBeNull();
        });
    });

    it('opens where the time went from the time, and what it weighed from the size', async () => {
        render(<ResponseSummary response={responseOf(200)} />, { wrapper: AppProviders });

        const time = screen.getByRole('button', { name: '142 ms' });

        fireEvent.pointerEnter(time, { pointerType: 'mouse' });

        expect(await screen.findByText('DNS lookup')).toBeVisible();

        fireEvent.pointerLeave(time, { pointerType: 'mouse' });
        fireEvent.pointerEnter(screen.getByRole('button', { name: '900 B' }), {
            pointerType: 'mouse',
        });

        expect(await screen.findByText('3.1 kB')).toBeVisible();
    });

    it('is a summary of a send that is done and went well', () => {
        render(<ResponseSummary response={responseOf(200)} />, { wrapper: AppProviders });

        const band = document.querySelector('[data-part="response-summary"]');

        expect(band).toHaveAttribute('data-state', 'done');
        expect(band).toHaveAttribute('data-fault', 'false');
    });

    it('holds what the caller puts inside it at the far end of the line', () => {
        render(
            <ResponseSummary response={responseOf(200)}>
                <span>extra</span>
            </ResponseSummary>,
            { wrapper: AppProviders },
        );

        expect(screen.getByText('extra')).toBeVisible();
    });

    it('names the graphql errors of a 200 and colours the line as a failure', () => {
        render(
            <ResponseSummary
                response={responseOf(200, '2', { count: 2, messages: ['no such user', 'denied'] })}
            />,
            { wrapper: AppProviders },
        );

        expect(screen.getByText('GraphQL errors: 2')).toBeVisible();
        expect(document.querySelector('[data-part="response-summary"]')).toHaveAttribute(
            'data-fault',
            'true',
        );
    });

    it('says nothing of graphql when the answer carried no errors', () => {
        render(<ResponseSummary response={responseOf(200)} />, { wrapper: AppProviders });

        expect(screen.queryByText(/GraphQL errors/)).toBeNull();
    });
});
