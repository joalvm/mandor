import { describe, expect, it } from 'vitest';

import { sniffHar } from '../../../src/har/document/sniff-har.js';

describe('sniffHar', () => {
    it('knows a recording by the entries of its log', () => {
        expect(sniffHar('{"log": {"version": "1.2", "entries": []}}')).toBe(true);
    });

    it('refuses a log that carries no list of entries, and any other document', () => {
        expect(sniffHar('{"log": {"version": "1.2"}}')).toBe(false);
        expect(sniffHar('{"log": []}')).toBe(false);
        expect(sniffHar('{"openapi": "3.1.0"}')).toBe(false);
        expect(sniffHar('not json')).toBe(false);
    });
});
