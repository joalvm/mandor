import dns from 'node:dns';
import net from 'node:net';
import type tls from 'node:tls';
import { performance } from 'node:perf_hooks';

import type { SyncHttpVersion, SyncRequest } from '../request/sync-request.js';
import { httpVersionRefusal } from '../tls/http-version.js';
import { tlsOptionsOf } from '../tls/tls-options-of.js';
import type { ConnectionPhases } from './connection-phases.js';
import { openSocket, type SocketRuntime } from './timed-socket.js';

export type TimedConnector = (
    options: { hostname: string; port: number | string; protocol: string; servername?: string },
    // Undici's connector contract, verbatim: (null, socket) on success, (error, null) on failure.
    callback: (...args: [null, net.Socket | tls.TLSSocket] | [Error, null]) => void,
) => void;

/**
 * A connector with the same contract undici expects, that writes the three phases into the
 * `phases` record the caller keeps. Undici's `buildConnector` cannot hand TCP and TLS apart
 * (it runs `tls.connect` straight onto the internal socket), so the phases are connected by
 * hand: a measured DNS lookup, a measured TCP connect, a measured TLS upgrade with ALPN. The
 * connect timeout fires when no phase finishes in time, with the code the reason map reads.
 * A connection that does not speak the HTTP version the request demands is closed before the
 * request is written. SNI carries names only: a literal address is never a server name.
 */
export function timedConnector(
    settings: SyncRequest['tls'],
    connectMs: number,
    phases: ConnectionPhases,
    httpVersion: SyncHttpVersion = 'auto',
): TimedConnector {
    return (options, callback) => {
        let settled = false;
        let connecting: net.Socket | tls.TLSSocket | undefined;
        const startedAt = performance.now();
        const timer = setTimeout(() => {
            const error: NodeJS.ErrnoException = new Error(
                `connect timed out after ${String(connectMs)}ms`,
            );

            error.code = 'UND_ERR_CONNECT_TIMEOUT';
            // The half-open socket must not outlive the timeout it belongs to.
            connecting?.destroy();
            fail(error);
        }, connectMs);

        const fail = (error: Error): void => {
            if (settled) {
                return;
            }

            settled = true;
            clearTimeout(timer);
            callback(error, null);
        };

        const done = (socket: net.Socket | tls.TLSSocket): void => {
            if (settled) {
                return;
            }

            const refusal = httpVersionRefusal(httpVersion, phases.alpnProtocol);

            if (refusal !== null) {
                socket.destroy();
                fail(refusal);

                return;
            }

            settled = true;
            clearTimeout(timer);
            callback(null, socket);
        };

        const runtime: SocketRuntime = {
            done,
            fail,
            phases,
            remember: (socket: net.Socket | tls.TLSSocket) => {
                connecting = socket;
            },
            startedAt,
        };

        const hostname = options.servername ?? options.hostname;
        const tlsOptions: tls.ConnectionOptions = {
            ...(net.isIP(hostname) === 0 ? { servername: hostname } : {}),
            ...tlsOptionsOf(settings, httpVersion),
        };

        if (net.isIP(options.hostname) !== 0) {
            openSocket(
                {
                    hostname: options.hostname,
                    port: Number(options.port),
                    protocol: options.protocol,
                    tlsOptions,
                },
                runtime,
            );

            return;
        }

        dns.lookup(options.hostname, { all: true, order: 'verbatim' }, (error, addresses) => {
            if (settled) {
                return;
            }

            if (error) {
                fail(error);

                return;
            }

            phases.dnsMs = performance.now() - startedAt;
            openSocket(
                {
                    hostname,
                    port: Number(options.port),
                    protocol: options.protocol,
                    tlsOptions,
                    addresses,
                },
                runtime,
            );
        });
    };
}
