import { describe, expect, it } from 'vitest';

import type { RequestLine } from '../../src/request/request-line.js';

describe('RequestLine', () => {
    it('keeps what a line of query or headers is: the pair, and its switch', () => {
        const line: RequestLine = { enabled: false, key: 'dryRun', value: 'true' };

        expect(Object.keys(line).sort()).toEqual(['enabled', 'key', 'value']);
    });
});
