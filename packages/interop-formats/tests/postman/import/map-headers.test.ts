import { describe, expect, it } from 'vitest';

import { headersOf } from '../../../src/postman/import/map-headers.js';

describe('headersOf', () => {
    it('reads the rows that have a name, and the one switched off stays so', () => {
        expect(
            headersOf({
                header: [
                    { key: 'A', value: '1' },
                    { key: 'B', disabled: true },
                    { key: ' ' },
                    { key: null },
                    {},
                ],
            }),
        ).toEqual([
            { name: 'A', in: 'header', required: false, enabled: true, value: '1' },
            { name: 'B', in: 'header', required: false, enabled: false, value: '' },
        ]);
    });

    it('has none for a request with no headers', () => {
        expect(headersOf({})).toEqual([]);
    });
});
