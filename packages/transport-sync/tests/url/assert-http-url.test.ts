import { describe, expect, it } from 'vitest';

import { SyncSendError } from '../../src/send/sync-send-error.js';
import { assertHttpUrl } from '../../src/url/assert-http-url.js';

/** Everything the refusal of `value` carries out: its message, its stack and each field of its own. */
function carriedBy(value: string): string {
    try {
        assertHttpUrl(value);
    } catch (error) {
        return JSON.stringify(error, Object.getOwnPropertyNames(error));
    }

    throw new Error('the url was let through');
}

describe('assertHttpUrl', () => {
    it('accepts an http URL and returns it parsed', () => {
        const url = assertHttpUrl('http://127.0.0.1:8080/path');

        expect(url).toBeInstanceOf(URL);
        expect(url.protocol).toBe('http:');
    });

    it('accepts an https URL with path and query', () => {
        const url = assertHttpUrl('https://example.com/socket?token=abc');

        expect(url.protocol).toBe('https:');
        expect(url.pathname).toBe('/socket');
        expect(url.search).toBe('?token=abc');
    });

    it.each(['ftp://example.com', 'file:///etc/passwd', 'javascript:alert(1)'])(
        'rejects the %s scheme',
        (value) => {
            expect(() => assertHttpUrl(value)).toThrow(SyncSendError);

            try {
                assertHttpUrl(value);
            } catch (error) {
                expect((error as SyncSendError).reason).toBe('scheme');
            }
        },
    );

    it.each(['https://user:secret@example.com/', 'https://user@example.com/'])(
        'lets the credentials of %s through',
        (value) => {
            expect(assertHttpUrl(value).host).toBe('example.com');
        },
    );

    /** The message reaches the log, and a url refused for its scheme or its shape may hold a password. */
    it.each([
        'ftp://user:secret@example.com/',
        'user:secret@example.com',
        'http//user:secret@example.com',
    ])('carries nothing the url held when it refuses %s', (value) => {
        expect(carriedBy(value)).not.toContain('secret');
    });

    it('rejects a value that does not parse as a URL', () => {
        expect(() => assertHttpUrl('not a url')).toThrow(SyncSendError);
    });
});
