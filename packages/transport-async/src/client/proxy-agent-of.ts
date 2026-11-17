import type { Agent } from 'node:http';

import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';

import type { ClientProxy } from './client-network.js';

type AgentFactory = (url: string) => Agent;

/** The agent each proxy scheme tunnels with, keyed by the scheme of its url. */
const AGENTS: Record<string, AgentFactory> = {
    'http:': (url) => new HttpsProxyAgent(url),
    'https:': (url) => new HttpsProxyAgent(url),
    'socks:': (url) => new SocksProxyAgent(url),
    'socks4:': (url) => new SocksProxyAgent(url),
    'socks4a:': (url) => new SocksProxyAgent(url),
    'socks5:': (url) => new SocksProxyAgent(url),
    'socks5h:': (url) => new SocksProxyAgent(url),
};

/**
 * The agent a socket dials through, or none when it goes direct. A scheme no agent speaks is
 * refused instead of dialled direct: a network that demanded a proxy would be skipped in
 * silence.
 */
export function proxyAgentOf(proxy: ClientProxy | undefined): Agent | undefined {
    if (proxy === undefined) {
        return undefined;
    }

    const factory = AGENTS[new URL(proxy.url).protocol];

    if (factory === undefined) {
        throw new Error(`the proxy ${new URL(proxy.url).protocol} is not supported`);
    }

    return factory(proxy.url);
}
