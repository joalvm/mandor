import { describe, expect, it } from 'vitest';

import { documentRootOf } from '../../src/format/document-root.js';

describe('documentRootOf', () => {
    it('reads the root object of a JSON text', () => {
        expect(documentRootOf('{"openapi": "3.1.0"}')).toEqual({ openapi: '3.1.0' });
    });

    it('reads the root object of a YAML text', () => {
        expect(documentRootOf('asyncapi: 3.0.0\ninfo:\n  title: Pasarela\n')).toEqual({
            asyncapi: '3.0.0',
            info: { title: 'Pasarela' },
        });
    });

    it('answers null for a text that holds no object at its root', () => {
        expect(documentRootOf('[1, 2]')).toBeNull();
        expect(documentRootOf('just words')).toBeNull();
        expect(documentRootOf('')).toBeNull();
    });

    it('answers null for a text neither format can read', () => {
        expect(documentRootOf('a: [unclosed')).toBeNull();
    });
});
