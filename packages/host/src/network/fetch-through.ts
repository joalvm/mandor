import {
    Agent,
    fetch,
    ProxyAgent,
    Socks5ProxyAgent,
    type Dispatcher,
    type RequestInit,
} from 'undici';

import type { DialNetwork, DialTls, NetworkFor } from './network-for.js';

/** The TLS one dial carries, as the agents of undici take it: a bundle as a buffer. */
type AgentTls = Omit<DialTls, 'pfx'> & { pfx?: Buffer };

/** The agent each proxy scheme dials with, keyed by the scheme of its url. */
const AGENT_OF_SCHEME: Record<string, (proxy: URL, tls: AgentTls) => Dispatcher> = {
    'http:': tunnelOf,
    'https:': tunnelOf,
    'socks5:': socksOf,
    'socks5h:': socksOf,
};

/** Statuses whose answer carries no body: a response built with one is refused. */
const BODILESS = new Set([101, 103, 204, 205, 304]);

/**
 * A token or a metadata document is a few kilobytes. A body past this is a server gone wrong, and
 * reading it whole would fill the memory of the main process before the deadline came.
 */
const BODY_LIMIT = 1024 * 1024;

/** An HTTP proxy tunnels with CONNECT; the handshake with the endpoint rides inside, with its TLS. */
function tunnelOf(proxy: URL, tls: AgentTls): Dispatcher {
    return new ProxyAgent({ uri: proxy.href, requestTls: tls });
}

/** A SOCKS5 proxy resolves the name of the endpoint itself, so `socks5h:` dials the same. */
function socksOf(proxy: URL, tls: AgentTls): Dispatcher {
    const url = new URL(proxy.href);

    url.protocol = 'socks5:';

    return new Socks5ProxyAgent(url, { requestTls: tls });
}

function agentTlsOf({ pfx, ...pem }: DialTls): AgentTls {
    return pfx === undefined ? pem : { ...pem, pfx: Buffer.from(pfx) };
}

/**
 * The dispatcher one request talks through: the plain agent with the TLS of the network, or the
 * agent of the scheme of its proxy. A scheme no agent speaks fails instead of going direct: a
 * network that demands a proxy would be skipped in silence.
 */
function dispatcherOf(network: DialNetwork): Dispatcher {
    const tls = agentTlsOf(network.tls);

    if (network.proxy === undefined) {
        return new Agent({ connect: tls });
    }

    const proxy = new URL(network.proxy.url);
    const agentOf = AGENT_OF_SCHEME[proxy.protocol];

    if (agentOf === undefined) {
        throw new Error(`the proxy ${proxy.protocol} is not supported`);
    }

    return agentOf(proxy, tls);
}

/** The body read chunk by chunk; past the limit the stream is cancelled and the read fails. */
async function boundedBody(body: AsyncIterable<Uint8Array>): Promise<Uint8Array<ArrayBuffer>> {
    const chunks: Uint8Array[] = [];
    let size = 0;

    for await (const chunk of body) {
        size += chunk.byteLength;

        if (size > BODY_LIMIT) {
            throw new Error(`the answer is larger than ${String(BODY_LIMIT)} bytes`);
        }

        chunks.push(chunk);
    }

    return new Uint8Array(Buffer.concat(chunks));
}

/**
 * A fetch that reaches each url the way the requests of the apps do: through the proxy of this
 * machine, with the authorities it adds and the client certificate of the host. The answer is
 * read whole before the dispatcher closes, so no socket outlives the request.
 */
export function fetchThrough(
    networkFor: NetworkFor,
): (url: string, init: RequestInit) => Promise<Response> {
    return async (url, init) => {
        const dispatcher = dispatcherOf(await networkFor(url));

        try {
            const answer = await fetch(url, { ...init, dispatcher });
            const body =
                BODILESS.has(answer.status) || answer.body === null
                    ? null
                    : await boundedBody(answer.body);

            return new Response(body, {
                headers: [...answer.headers],
                status: answer.status,
                statusText: answer.statusText,
            });
        } finally {
            await dispatcher.close();
        }
    };
}
