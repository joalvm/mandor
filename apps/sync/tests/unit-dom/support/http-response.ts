import { httpResponseSchema, type HttpResponse } from '@mandor/schema';

type Overrides = Partial<Record<keyof HttpResponse, unknown>>;

/** A response of the kind a local server answers, with whatever the test wants different. */
export function httpResponseWith(overrides: Overrides = {}): HttpResponse {
    return httpResponseSchema.parse({
        status: 200,
        statusText: 'OK',
        httpVersion: '1.1',
        headers: [],
        body: null,
        sizes: { transferredBytes: 900, bodyBytes: 3100, decoded: true },
        timings: {
            dnsMs: 5,
            connectMs: 10,
            tlsMs: 20,
            firstByteMs: 40,
            totalMs: 100,
            viaProxy: false,
        },
        redirects: [],
        cookies: [],
        ...overrides,
    });
}

/** A body that stayed in memory, as text. */
export function textBody(text: string) {
    return { encoding: 'utf8', kind: 'inline', text } as const;
}

/** Makes the clipboard of the window one the test can read. */
export function stubClipboard(writeText: (text: string) => Promise<void>): void {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
}
