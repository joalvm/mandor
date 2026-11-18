import { describe, expect, it } from 'vitest';

import { sniffAsyncapi } from '../../../src/asyncapi/document/sniff-asyncapi.js';

describe('sniffAsyncapi', () => {
    it('knows an AsyncAPI document in YAML and in JSON', () => {
        expect(sniffAsyncapi('asyncapi: 3.0.0\ninfo:\n  title: Pasarela\n')).toBe(true);
        expect(sniffAsyncapi('{"asyncapi": "2.6.0"}')).toBe(true);
    });

    it('does not take a key that only sits deeper for the version of the document', () => {
        expect(sniffAsyncapi('info:\n  asyncapi: 3.0.0\n')).toBe(false);
    });

    it('refuses another format and a text that is not a document', () => {
        expect(sniffAsyncapi('{"openapi": "3.1.0"}')).toBe(false);
        expect(sniffAsyncapi('')).toBe(false);
    });
});
