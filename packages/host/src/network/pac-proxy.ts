import { UnsupportedProxyError } from './unsupported-proxy-error.js';

/** The scheme each kind of entry of a PAC answer dials, as Chromium names them. */
const SCHEME_OF_ENTRY: Record<string, string> = {
    PROXY: 'http',
    HTTPS: 'https',
    SOCKS: 'socks4',
    SOCKS4: 'socks4',
    SOCKS5: 'socks5',
};

/**
 * Turns what the system says of a url — the PAC answer, `PROXY host:port; DIRECT` — into the
 * proxy to dial through. The first entry decides: a later one is the system's fallback, and
 * neither transport can try it. `DIRECT` or nothing goes direct; an entry nobody speaks fails,
 * because going direct instead would skip the proxy of a network that demanded it, in silence.
 */
export function pacProxyOf(answer: string): string | undefined {
    const first = answer.split(';')[0]?.trim() ?? '';
    const [kind = '', host = ''] = first.split(/\s+/u);
    const scheme = SCHEME_OF_ENTRY[kind.toUpperCase()];

    if (scheme !== undefined && host !== '') {
        return `${scheme}://${host}`;
    }

    if (kind === '' || kind.toUpperCase() === 'DIRECT') {
        return undefined;
    }

    throw new UnsupportedProxyError(kind);
}
