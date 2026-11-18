import { describe, expect, it } from 'vitest';

import { urlWithQuery } from '../../../src/bruno/export/url-with-query.js';

describe('urlWithQuery', () => {
    it('leaves the url as it is when nothing is sent', () => {
        expect(urlWithQuery('wss://x.test/chat', [])).toBe('wss://x.test/chat');
        expect(
            urlWithQuery('wss://x.test/chat', [
                { key: 'off', value: '1', enabled: false },
                { key: '', value: 'x', enabled: true },
            ]),
        ).toBe('wss://x.test/chat');
    });

    it('appends the rows that are sent after a question mark', () => {
        expect(
            urlWithQuery('wss://x.test/chat', [
                { key: 'room', value: '1', enabled: true },
                { key: 'user', value: 'ana', enabled: true },
            ]),
        ).toBe('wss://x.test/chat?room=1&user=ana');
    });

    it('goes on with an ampersand when the url already has a query', () => {
        expect(
            urlWithQuery('wss://x.test/chat?a=1', [{ key: 'b', value: '2', enabled: true }]),
        ).toBe('wss://x.test/chat?a=1&b=2');
    });
});
