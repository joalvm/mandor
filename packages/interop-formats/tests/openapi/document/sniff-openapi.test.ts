import { describe, expect, it } from 'vitest';

import { sniffOpenapi } from '../../../src/openapi/document/sniff-openapi.js';

describe('sniffOpenapi', () => {
    it('knows an OpenAPI document and a Swagger one, in JSON and in YAML', () => {
        expect(sniffOpenapi('{"openapi": "3.1.0", "info": {}}')).toBe(true);
        expect(sniffOpenapi('{"swagger": "2.0"}')).toBe(true);
        expect(sniffOpenapi('openapi: 3.0.3\ninfo:\n  title: Tienda\n')).toBe(true);
    });

    it('does not take a key that only sits deeper for the version of the document', () => {
        expect(sniffOpenapi('{"info": {"openapi": "3.1.0"}}')).toBe(false);
        expect(sniffOpenapi('info:\n  openapi: 3.1.0\n')).toBe(false);
    });

    it('refuses another format and a text that is not a document', () => {
        expect(sniffOpenapi('asyncapi: 3.0.0')).toBe(false);
        expect(sniffOpenapi('just words')).toBe(false);
    });
});
