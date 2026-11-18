import { Agent, ProxyAgent, Socks5ProxyAgent, type Dispatcher } from 'undici';

import type { SyncRequest } from '../request/sync-request.js';
import { SyncSendError } from '../send/sync-send-error.js';
import type { ConnectionPhases } from '../timing/connection-phases.js';
import { timedConnector, type TimedConnector } from '../timing/timed-connector.js';
import { tlsOptionsOf, type RequestTlsOptions } from '../tls/tls-options-of.js';

type ProxyDial = {
    proxy: URL;
    allowH2: boolean;
    connect: TimedConnector;
    requestTls: RequestTlsOptions;
};

/** An HTTP proxy tunnels with CONNECT; the target handshake rides inside, with the request's TLS. */
function tunnelOf({ proxy, allowH2, connect, requestTls }: ProxyDial): Dispatcher {
    return new ProxyAgent({ uri: proxy.href, allowH2, connect, requestTls });
}

/**
 * A SOCKS5 proxy, reached by the timed connector. The target's name travels to the proxy and the
 * proxy resolves it, so `socks5h:` — the spelling that asks for exactly that — dials the same.
 */
function socksOf({ proxy, allowH2, connect, requestTls }: ProxyDial): Dispatcher {
    const url = new URL(proxy.href);

    url.protocol = 'socks5:';

    return new Socks5ProxyAgent(url, { allowH2, connect, requestTls });
}

/** The agent each proxy scheme dials with, keyed by the scheme of its url. */
const AGENT_OF_SCHEME: Record<string, (dial: ProxyDial) => Dispatcher> = {
    'http:': tunnelOf,
    'https:': tunnelOf,
    'socks5:': socksOf,
    'socks5h:': socksOf,
};

/**
 * The dispatcher one send talks through. Without a proxy it is the plain agent with the timed
 * connector; with one, the agent of its scheme, with the same timed connector and the request's
 * TLS to the target through `requestTls` — without it the target handshake would validate
 * against the system store and a private CA would fail. A scheme no agent speaks fails instead
 * of going direct: a network that demanded a proxy would be skipped in silence. The proxy is a
 * URL of the request, never an environment variable of the machine. An `http1` request keeps
 * every agent off HTTP/2, so neither the target nor a pooled socket speaks it.
 */
export function dispatcherOf(request: SyncRequest, phases: ConnectionPhases): Dispatcher {
    const httpVersion = request.httpVersion ?? 'auto';
    const allowH2 = httpVersion !== 'http1';
    const connect = timedConnector(request.tls, request.timeouts.connectMs, phases, httpVersion);

    if (request.proxy === undefined) {
        return new Agent({ allowH2, connect });
    }

    const proxy = new URL(request.proxy.url);
    const agentOf = AGENT_OF_SCHEME[proxy.protocol];

    if (agentOf === undefined) {
        throw new SyncSendError('proxy-scheme', `the proxy ${proxy.protocol} is not supported`);
    }

    return agentOf({ proxy, allowH2, connect, requestTls: tlsOptionsOf(request.tls, httpVersion) });
}
