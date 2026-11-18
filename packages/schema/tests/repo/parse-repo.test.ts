import { describe, expect, it } from 'vitest';

import {
    FormatError,
    FormatVersionError,
    parseRepo,
    repoSchema,
    REPO_FORMAT,
} from '../../src/index.js';

const validRepo = { formatVersion: REPO_FORMAT, name: 'Personal', workspaces: [] };

describe('parseRepo', () => {
    it('accepts a valid repo', () => {
        expect(parseRepo(validRepo)).toEqual(validRepo);
    });

    it('reports the exact path of a wrongly typed field', () => {
        expect(() => {
            parseRepo({ ...validRepo, name: 42 });
        }).toThrow(FormatError);

        expect(() => {
            parseRepo({ ...validRepo, name: 42 });
        }).toThrow(/name/);
    });

    it('throws FormatVersionError when the format is newer than supported', () => {
        expect(() => {
            parseRepo({ ...validRepo, formatVersion: 99 });
        }).toThrow(FormatVersionError);
    });

    it.each([1.5, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
        'treats invalid numeric formatVersion %s as a format error',
        (formatVersion) => {
            expect(() => parseRepo({ ...validRepo, formatVersion })).toThrow(FormatError);
        },
    );

    it('treats a non-numeric formatVersion as a plain format error, not a version error', () => {
        expect(() => {
            parseRepo({ ...validRepo, formatVersion: 'uno' });
        }).toThrow(FormatError);

        expect(() => {
            parseRepo({ ...validRepo, formatVersion: 'uno' });
        }).not.toThrow(FormatVersionError);
    });

    it('treats a non-object input as a format error, not a version error', () => {
        expect(() => {
            parseRepo('yaml crudo');
        }).toThrow(FormatError);
    });

    it('rejects a duplicated workspace id in display order', () => {
        expect(() => {
            parseRepo({ ...validRepo, workspaces: ['api-pagos', 'api-pagos'] });
        }).toThrow(/workspaces\.1/);
    });

    it('rejects a name containing only whitespace', () => {
        expect(() => parseRepo({ ...validRepo, name: '   ' })).toThrow(/name/);
    });

    it('rejects unsupported versions through the reusable zod schema', () => {
        expect(repoSchema.safeParse({ ...validRepo, formatVersion: 99 }).success).toBe(false);
    });

    it('accepts unknown keys but strips them from parsed domain data', () => {
        const parsed = parseRepo({ ...validRepo, owner: 'future-field' });

        expect(parsed).toEqual(validRepo);
    });
});
