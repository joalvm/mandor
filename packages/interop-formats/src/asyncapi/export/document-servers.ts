import type { InteropServer } from '@mandor/interop-core';

/**
 * The servers of the document, from the connections the workspace holds. The format wants the
 * endpoint split — host, and the path that hangs off it — and the url answers with both when
 * the runtime reads it; nothing here parses by hand.
 */
export function serversOfDocument(
    servers: readonly InteropServer[],
): Record<string, Record<string, unknown>> {
    const written: Record<string, Record<string, unknown>> = {};

    for (const server of servers) {
        written[server.name] = serverOf(server);
    }

    return written;
}

function serverOf(server: InteropServer): Record<string, unknown> {
    const place = placeOf(server.url);

    return {
        host: place.host,
        ...(place.pathname === undefined ? {} : { pathname: place.pathname }),
        protocol: server.protocol,
        ...(server.security.length === 0 ? {} : { security: securityOf(server.security) }),
        ...server.extras,
    };
}

function placeOf(url: string): { host: string; pathname?: string } {
    try {
        const read = new URL(url);
        const host = hostOf(url, read.host);
        const pathname = read.pathname;

        return pathname === '/' || pathname === '' ? { host } : { host, pathname };
    } catch {
        return { host: url };
    }
}

/**
 * The runtime normalizes the default port away — `:443` on a wss url — and the document keeps
 * what was written: the same service, spelled the way its document spelled it.
 */
function hostOf(url: string, host: string): string {
    if (host.includes(':')) {
        return host;
    }

    return /:\/\/([^/]+)/u.exec(url)?.[1] ?? host;
}

/** In 3.x a security entry is the scheme itself, pointed at — not the named map 2.x used. */
function securityOf(names: readonly string[]): Record<string, unknown>[] {
    return names.map((name) => ({ $ref: `#/components/securitySchemes/${pointerOf(name)}` }));
}

/** A JSON pointer says a name with `/` as `~1` and a name with `~` as `~0`. */
function pointerOf(name: string): string {
    return name.replace(/~/gu, '~0').replace(/\//gu, '~1');
}
