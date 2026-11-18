import { describe, expect, it } from 'vitest';

import { linesOf } from '../../../src/bruno/import/request-lines.js';

describe('the rows of a table as lines of a request', () => {
    it('keeps a row switched off, switched off', () => {
        expect(linesOf([{ name: 'a', value: '1', disabled: true }])).toEqual([
            { key: 'a', value: '1', enabled: false },
        ]);
    });
});
