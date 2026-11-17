import { describe, expect, it } from 'vitest';

import { withHeaderLines } from '../../src/connection/with-header-lines.js';

describe('reading the headers of a connection written as records', () => {
    it('turns the sent and the switched-off headers into lines, the sent ones first', () => {
        expect(
            withHeaderLines({
                headers: { Authorization: 'Bearer {{token}}' },
                disabledHeaders: { 'X-Debug': '1' },
            }),
        ).toEqual({
            headers: [
                { key: 'Authorization', value: 'Bearer {{token}}', enabled: true },
                { key: 'X-Debug', value: '1', enabled: false },
            ],
            disabledHeaders: { 'X-Debug': '1' },
        });
    });

    it('reads a file with no switched-off headers', () => {
        expect(withHeaderLines({ headers: { Accept: 'text/plain' } })).toEqual({
            headers: [{ key: 'Accept', value: 'text/plain', enabled: true }],
        });
    });

    it('leaves headers already written as lines as they are', () => {
        const current = { headers: [{ key: 'Accept', value: 'text/plain', enabled: true }] };

        expect(withHeaderLines(current)).toBe(current);
    });

    it('leaves what is not a connection for the schema to refuse', () => {
        expect(withHeaderLines(null)).toBeNull();
        expect(withHeaderLines(['headers'])).toEqual(['headers']);
    });
});
