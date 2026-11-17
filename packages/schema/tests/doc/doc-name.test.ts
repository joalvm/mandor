import { describe, expect, it } from 'vitest';

import { assertDocName, docNameSchema, IdError, isDocName } from '../../src/index.js';
import { DOC_EXTENSION } from '../../src/doc/doc-name.js';

describe('isDocName', () => {
    it.each(['readme.md', 'Getting Started.md', 'notas-de-la-api.md', 'a.md'])(
        'accepts "%s"',
        (value) => {
            expect(isDocName(value)).toBe(true);
        },
    );

    /** The name reaches `join`, so anything that could name a second level is not a doc. */
    it.each([
        '',
        '.md',
        '..md',
        '.hidden.md',
        'readme.txt',
        'readme',
        'notes/readme.md',
        'notes\\readme.md',
        '../readme.md',
        'a:b.md',
        'a|b.md',
        'a*b.md',
        'a?b.md',
        'a<b.md',
        'a>b.md',
        'a"b.md',
        'a\u0000b.md',
    ])('rejects "%s"', (value) => {
        expect(isDocName(value)).toBe(false);
    });

    it('rejects a name longer than a portable file name', () => {
        expect(isDocName(`${'a'.repeat(253)}${DOC_EXTENSION}`)).toBe(false);
    });
});

describe('assertDocName', () => {
    it('lets one markdown file of the workspace through', () => {
        expect(() => {
            assertDocName('readme.md');
        }).not.toThrow();
    });

    it('carries the rejected name in the error', () => {
        expect(() => {
            assertDocName('../readme.md');
        }).toThrow(expect.objectContaining({ name: 'IdError', value: '../readme.md' }));
    });

    it('refuses anything that is not one markdown file', () => {
        expect(() => {
            assertDocName('notes/readme.md');
        }).toThrow(IdError);
    });
});

describe('docNameSchema', () => {
    it('parses a doc name that names one file', () => {
        expect(docNameSchema.parse('readme.md')).toBe('readme.md');
    });

    it('refuses a name that walks out of the folder', () => {
        expect(docNameSchema.safeParse('../readme.md').success).toBe(false);
    });
});
