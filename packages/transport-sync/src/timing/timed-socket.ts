import type dns from 'node:dns';
import net from 'node:net';
import tls from 'node:tls';
import { performance } from 'node:perf_hooks';

import type { ConnectionPhases } from './connection-phases.js';
import { networkOf, tlsDetailsOf } from './network-of.js';

/** The three connection phases land here while the socket opens; `remember` tracks the live socket. */
export type SocketRuntime = {
    /** Answers the connector with the failure; the connector stays settled either way. */
    fail: (error: Error) => void;
    /** Answers the connector with the socket that finally connected. */
    done: (socket: net.Socket | tls.TLSSocket) => void;
    remember: (socket: net.Socket | tls.TLSSocket) => void;
    phases: ConnectionPhases;
    startedAt: number;
};

type LookupAddresses = dns.LookupAddress[];

export type OpenTarget = {
    hostname: string;
    port: number;
    protocol: string;
    tlsOptions: tls.ConnectionOptions;
    addresses?: LookupAddresses;
};

/** Opens the TCP socket of the target, measuring the connect phase, and upgrades it to TLS when the protocol asks. */
export function openSocket(target: OpenTarget, runtime: SocketRuntime): void {
    const { hostname, port, protocol, tlsOptions, addresses } = target;
    const socket = net.connect({
        host: hostname,
        port,
        // With a literal address there is no lookup; with a name, the resolved candidates go
        // back to the stack so happy eyeballs picks the first one that answers.
        ...(addresses === undefined
            ? {}
            : {
                  autoSelectFamily: true,
                  lookup: (
                      _host: string,
                      _opts: dns.LookupOptions,
                      done: (error: Error | null, found: dns.LookupAddress[] | string) => void,
                  ) => {
                      done(null, addresses);
                  },
              }),
    });

    runtime.remember(socket);
    socket.once('error', (error) => {
        runtime.fail(error);
    });
    socket.once('connect', () => {
        runtime.phases.connectMs = performance.now() - runtime.startedAt - runtime.phases.dnsMs;

        if (protocol !== 'https:') {
            runtime.phases.alpnProtocol = null;
            runtime.phases.lastPhaseEndAt = performance.now();
            runtime.phases.network = networkOf(socket);
            runtime.done(socket);

            return;
        }

        upgradeTls(socket, runtime, tlsOptions);
    });
}

/** Runs the TLS handshake on the open socket, with ALPN, and measures it apart. */
function upgradeTls(
    tcp: net.Socket,
    runtime: SocketRuntime,
    tlsOptions: tls.ConnectionOptions,
): void {
    const tlsStart = performance.now();
    const secure = tls.connect({ ...tlsOptions, socket: tcp });

    runtime.remember(secure);
    secure.once('error', (error) => {
        runtime.fail(error);
    });
    secure.once('secureConnect', () => {
        runtime.phases.tlsMs = performance.now() - tlsStart;
        runtime.phases.alpnProtocol = secure.alpnProtocol === false ? null : secure.alpnProtocol;
        runtime.phases.lastPhaseEndAt = performance.now();
        runtime.phases.network = networkOf(secure, tlsDetailsOf(secure));
        runtime.done(secure);
    });
}
