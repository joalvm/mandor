import { describe, expect, it } from 'vitest';

import { baseNameOf, dirNamesOf, stemOf } from '../../../src/bruno/document/file-name.js';

describe('file names of a path', () => {
    it('takes the last name of a path, with or without directories', () => {
        expect(baseNameOf('Pets/Dogs/List.bru')).toBe('List.bru');
        expect(baseNameOf('List.bru')).toBe('List.bru');
    });

    it('lists the directories a path goes through, outermost first', () => {
        expect(dirNamesOf('Pets/Dogs/List.bru')).toEqual(['Pets', 'Dogs']);
        expect(dirNamesOf('List.bru')).toEqual([]);
    });

    it('names a file as it is called without its extension', () => {
        expect(stemOf('Pets/List.bru')).toBe('List');
        expect(stemOf('environments/Staging.yml')).toBe('Staging');
        expect(stemOf('my.api.bru')).toBe('my.api');
        expect(stemOf('README')).toBe('README');
    });
});
