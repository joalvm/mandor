import { httpResponseSchema } from '@mandor/schema';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ResponseNetworkDetail } from '../../../src/renderer/response/ResponseNetworkDetail.js';
import { ResponseSizeDetail } from '../../../src/renderer/response/ResponseSizeDetail.js';
import { ResponseTimeDetail } from '../../../src/renderer/response/ResponseTimeDetail.js';
import { AppProviders } from '../support/app-providers.js';

afterEach(cleanup);

function responseOf(extra: Record<string, unknown>) {
    return httpResponseSchema.parse({
        status: 200,
        statusText: 'OK',
        httpVersion: '2',
        headers: [],
        body: null,
        sizes: { transferredBytes: 900, bodyBytes: 3100, decoded: true },
        timings: {
            dnsMs: 10,
            connectMs: 20,
            tlsMs: 30,
            firstByteMs: 40,
            totalMs: 120,
            viaProxy: false,
        },
        redirects: [],
        cookies: [],
        ...extra,
    });
}

/**
 * What the figures of the summary open (ResponseFact over a hover card, each panel headed by
 * FactHeading over FactRows, next to ResponseStatus), drawn here without the hover.
 */
describe('the details behind the figures of the summary', () => {
    it('lays the phases of the time out, and says a proxy hid them', () => {
        const { timings } = responseOf({});

        render(<ResponseTimeDetail timings={timings} />, { wrapper: AppProviders });

        expect(screen.getByText('DNS lookup')).toBeVisible();
        expect(screen.getByText('120 ms')).toBeVisible();

        cleanup();
        render(<ResponseTimeDetail timings={{ ...timings, viaProxy: true }} />, {
            wrapper: AppProviders,
        });

        expect(screen.getByText(/Sent through a proxy/)).toBeVisible();
    });

    it('weighs the answer and the request, and the decoded body when it differs', () => {
        const { sizes } = responseOf({
            sizes: {
                transferredBytes: 900,
                bodyBytes: 3100,
                decoded: true,
                headerBytes: 100,
                requestHeaderBytes: 200,
                requestBodyBytes: 50,
            },
        });

        render(<ResponseSizeDetail sizes={sizes} />, { wrapper: AppProviders });

        expect(screen.getByText('Decoded body')).toBeVisible();
        expect(screen.getByText('Request size')).toBeVisible();
        expect(screen.getByText('250 B')).toBeVisible();
    });

    it('leaves the request out of a send that did not count it', () => {
        render(<ResponseSizeDetail sizes={responseOf({}).sizes} />, { wrapper: AppProviders });

        expect(screen.queryByText('Request size')).toBeNull();
        expect(screen.queryByText('Headers')).toBeNull();
    });

    it('writes both ends of the socket, an IPv6 one in brackets, and the handshake', () => {
        const response = responseOf({
            network: {
                localAddress: '::1',
                localPort: 50_000,
                remoteAddress: '93.184.216.34',
                remotePort: 443,
                tls: {
                    protocol: 'TLSv1.3',
                    cipher: 'TLS_AES_128_GCM_SHA256',
                    subject: 'a.test',
                    issuer: 'Mandor CA',
                },
            },
        });

        render(<ResponseNetworkDetail response={response} />, { wrapper: AppProviders });

        expect(screen.getByText('[::1]:50000')).toBeVisible();
        expect(screen.getByText('93.184.216.34:443')).toBeVisible();
        expect(screen.getByText('TLSv1.3')).toBeVisible();
        expect(screen.getByText('Mandor CA')).toBeVisible();
        expect(screen.queryByText('Valid until')).toBeNull();
    });

    it('says only the protocol when the send kept no network', () => {
        render(<ResponseNetworkDetail response={responseOf({})} />, { wrapper: AppProviders });

        expect(screen.getByText('HTTP/2')).toBeVisible();
        expect(screen.queryByText('Server address')).toBeNull();
    });
});
