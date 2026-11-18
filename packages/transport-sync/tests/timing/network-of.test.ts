import type net from 'node:net';
import type tls from 'node:tls';
import { describe, expect, it } from 'vitest';

import { networkOf, tlsDetailsOf } from '../../src/timing/network-of.js';

function socket(fields: Partial<net.Socket>): net.Socket {
    return fields as net.Socket;
}

function secure(certificate: object, protocol: string | null = 'TLSv1.3'): tls.TLSSocket {
    return {
        getPeerCertificate: () => certificate,
        getProtocol: () => protocol,
        getCipher: () => ({ standardName: 'TLS_AES_128_GCM_SHA256' }),
    } as unknown as tls.TLSSocket;
}

describe('networkOf, both ends of the socket in a sync-network', () => {
    it('reads both ends of the socket', () => {
        const ends = socket({
            localAddress: '::1',
            localPort: 50_000,
            remoteAddress: '::1',
            remotePort: 8080,
        });

        expect(networkOf(ends)).toEqual({
            localAddress: '::1',
            localPort: 50_000,
            remoteAddress: '::1',
            remotePort: 8080,
        });
    });

    it('answers empty ends for a socket that already closed, and carries the handshake', () => {
        const details = { protocol: 'TLSv1.3', cipher: 'x' };

        expect(networkOf(socket({}), details)).toEqual({
            localAddress: '',
            localPort: 0,
            remoteAddress: '',
            remotePort: 0,
            tls: details,
        });
    });
});

describe('tlsDetailsOf', () => {
    it('reads protocol, cipher and the names of the certificate', () => {
        const details = tlsDetailsOf(
            secure({
                subject: { CN: 'a.test' },
                issuer: { O: 'Mandor CA' },
                valid_to: 'Jan  1 00:00:00 2030 GMT',
            }),
        );

        expect(details).toEqual({
            protocol: 'TLSv1.3',
            cipher: 'TLS_AES_128_GCM_SHA256',
            subject: 'a.test',
            issuer: 'Mandor CA',
            validTo: 'Jan  1 00:00:00 2030 GMT',
        });
    });

    it('joins a repeated name and leaves out what the certificate lacks', () => {
        const details = tlsDetailsOf(secure({ subject: { CN: ['a.test', 'b.test'] } }, null));

        expect(details).toEqual({
            protocol: '',
            cipher: 'TLS_AES_128_GCM_SHA256',
            subject: 'a.test, b.test',
        });
    });
});
