import type { CookiePort } from '../../src/cookie/cookie-port.js';
import type { SyncRequest } from '../../src/request/sync-request.js';
import type { SyncResponse } from '../../src/response/sync-response.js';

export function request(url: string, overrides: Partial<SyncRequest> = {}): SyncRequest {
    return Object.assign(
        {
            method: 'GET',
            url,
            headers: [],
            spill: {
                open: () => Promise.reject(new Error('the spill must not open')),
                thresholdBytes: 1 << 20,
            },
            timeouts: { connectMs: 1_000, totalMs: 5_000 },
            tls: { verify: false },
            redirects: { follow: true, max: 5 },
        } satisfies SyncRequest,
        overrides,
    );
}

export function response(status: number, headers: [string, string][] = []): SyncResponse {
    return {
        status,
        statusText: '',
        httpVersion: '1.1',
        headers,
        body: { kind: 'inline', bytes: new Uint8Array() },
        sizes: {
            transferredBytes: 0,
            bodyBytes: 0,
            decoded: false,
            headerBytes: 0,
            requestHeaderBytes: 0,
            requestBodyBytes: 0,
        },
        timings: { dnsMs: 0, connectMs: 0, tlsMs: 0, firstByteMs: 0, totalMs: 0, viaProxy: false },
        redirects: [],
    };
}

/** A jar of memory: one cookie per name and host, matched by host only. */
export function memoryJar(): CookiePort & { stored: [string, readonly string[]][] } {
    const cookies = new Map<string, string>();
    const stored: [string, readonly string[]][] = [];

    return {
        stored,
        header: (url) => {
            const host = new URL(url).host;
            const mine = [...cookies].filter(([key]) => key.startsWith(`${host}|`));

            return Promise.resolve(
                mine.length === 0
                    ? null
                    : mine.map(([key, value]) => `${key.split('|')[1] ?? ''}=${value}`).join('; '),
            );
        },
        store: (url, setCookies) => {
            stored.push([url, setCookies]);

            for (const line of setCookies) {
                const [name = '', value = ''] = (line.split(';')[0] ?? '').split('=');

                cookies.set(`${new URL(url).host}|${name}`, value);
            }

            return Promise.resolve();
        },
    };
}

export function at<T>(list: readonly T[], index: number): T {
    const found = list[index];

    if (found === undefined) {
        throw new Error(`nothing at ${String(index)}`);
    }

    return found;
}

export function headerOf(sent: SyncRequest, name: string): string | undefined {
    return sent.headers.find(([key]) => key.toLowerCase() === name)?.[1];
}
