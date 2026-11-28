import { formatNumber } from '@mandor/i18n';

/** A duration the way a person reads it: milliseconds until a second, then seconds. */
export function formatDuration(ms: number, language: string): string {
    return ms < 1000
        ? `${formatNumber(Math.round(ms), language)} ms`
        : `${formatNumber(ms / 1000, language, 1)} s`;
}

/** A phase of a send, which is often under a millisecond: up to two decimals, none trailing. */
export function formatPreciseDuration(ms: number, language: string): string {
    return ms < 1000 ? `${formatNumber(ms, language, 2, 0)} ms` : formatDuration(ms, language);
}

const UNITS = ['kB', 'MB', 'GB'];

/**
 * A size in thousands, as a network speaks of it, so 3100 bytes read `3.1 kB`. The number is
 * written the way the language writes it; the unit is the symbol every language reads.
 */
export function formatBytes(bytes: number, language: string): string {
    let value = bytes / 1000;
    let unit = 0;

    if (bytes < 1000) {
        return `${formatNumber(bytes, language)} B`;
    }

    while (value >= 1000 && unit < UNITS.length - 1) {
        value /= 1000;
        unit += 1;
    }

    return `${formatNumber(value, language, 1)} ${UNITS[unit] ?? 'GB'}`;
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
