import { describe, expect, it } from 'vitest';

import { scanTemplate } from '../../src/index.js';

describe('scanning a template', () => {
    it('returns a single literal when the text holds no placeholder', () => {
        expect(scanTemplate('wss://example.com/socket')).toEqual([
            { kind: 'literal', text: 'wss://example.com/socket' },
        ]);
    });

    it('returns an empty list for an empty text', () => {
        expect(scanTemplate('')).toEqual([]);
    });

    it('finds a placeholder between literal stretches', () => {
        expect(scanTemplate('wss://{{host}}/socket')).toEqual([
            { kind: 'literal', text: 'wss://' },
            { kind: 'variable', name: 'host', index: 6 },
            { kind: 'literal', text: '/socket' },
        ]);
    });

    /** The offset is where the interface underlines the occurrence. */
    it('reports the offset of every placeholder in the template', () => {
        expect(scanTemplate('{{a}} and {{b}}')).toEqual([
            { kind: 'variable', name: 'a', index: 0 },
            { kind: 'literal', text: ' and ' },
            { kind: 'variable', name: 'b', index: 10 },
        ]);
    });

    /** The escape is how the user writes a literal brace, same as Postman. */
    it('treats an escaped placeholder as the literal without the backslash', () => {
        expect(scanTemplate('Bearer \\{{token}}')).toEqual([
            { kind: 'literal', text: 'Bearer ' },
            { kind: 'literal', text: '{{token}}' },
        ]);
    });

    /** The name is exact: whitespace inside the braces means it is not a placeholder. */
    it('leaves a placeholder with spaces inside the braces as literal text', () => {
        expect(scanTemplate('{{ host }}')).toEqual([{ kind: 'literal', text: '{{ host }}' }]);
    });

    /** An unclosed opening is the user still typing, not an error. */
    it('leaves an unclosed opening as literal text', () => {
        expect(scanTemplate('value {{host')).toEqual([{ kind: 'literal', text: 'value {{host' }]);
    });

    /** `$` is banned in declarations but is how text references a dynamic variable. */
    it('finds a dynamic variable reference', () => {
        expect(scanTemplate('id: {{$uuid}}')).toEqual([
            { kind: 'literal', text: 'id: ' },
            { kind: 'variable', name: '$uuid', index: 4 },
        ]);
    });
});
