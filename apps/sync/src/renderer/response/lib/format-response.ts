/** A duration the way a person reads it: milliseconds until a second, then seconds. */
export function formatDuration(ms: number): string {
    return ms < 1000 ? `${String(Math.round(ms))} ms` : `${(ms / 1000).toFixed(1)} s`;
}

/** A phase of a send, which is often under a millisecond: up to two decimals, none trailing. */
export function formatPreciseDuration(ms: number): string {
    return ms < 1000 ? `${String(Number(ms.toFixed(2)))} ms` : formatDuration(ms);
}

const UNITS = ['kB', 'MB', 'GB'];

/** A size in thousands, as a network speaks of it, so 3100 bytes read `3.1 kB`. */
export function formatBytes(bytes: number): string {
    let value = bytes / 1000;
    let unit = 0;

    if (bytes < 1000) {
        return `${String(bytes)} B`;
    }

    while (value >= 1000 && unit < UNITS.length - 1) {
        value /= 1000;
        unit += 1;
    }

    return `${value.toFixed(1)} ${UNITS[unit] ?? 'GB'}`;
}

export function httpVersionLabel(version: '1.1' | '2'): string {
    return `HTTP/${version}`;
}

export type StatusFamily =
    'client-error' | 'informational' | 'redirect' | 'server-error' | 'success';

/** Which of the five hundreds a status belongs to; the schema keeps it between 100 and 599. */
export function statusFamilyOf(status: number): StatusFamily {
    if (status >= 500) {
        return 'server-error';
    }

    if (status >= 400) {
        return 'client-error';
    }

    if (status >= 300) {
        return 'redirect';
    }

    return status >= 200 ? 'success' : 'informational';
}

/** An end of the socket as it is written in a URL: an IPv6 address goes in brackets. */
export function formatSocketEnd(address: string, port: number): string {
    return address.includes(':') ? `[${address}]:${String(port)}` : `${address}:${String(port)}`;
}

type Sizes = { headerBytes?: number | undefined; transferredBytes: number };

/** What the answer weighed on the wire: its head, when it was counted, and its body as it came. */
export function responseBytesOf(sizes: Sizes): number {
    return (sizes.headerBytes ?? 0) + sizes.transferredBytes;
}
