import { describe, expect, it } from 'vitest';

import { LOCAL_ORIGIN_ID, originSchema } from '../../src/index.js';

describe('originSchema', () => {
    it('accepts the local origin, which carries no url', () => {
        expect(originSchema.parse({ id: LOCAL_ORIGIN_ID, name: 'Local', kind: 'local' })).toEqual({
            id: 'local',
            name: 'Local',
            kind: 'local',
        });
    });

    it('accepts a remote origin with the url it came from', () => {
        const origin = {
            id: 'equipo-api',
            name: 'Equipo API',
            kind: 'remote',
            url: 'https://github.com/equipo/api.git',
        };

        expect(originSchema.parse(origin)).toEqual(origin);
    });

    /** The scp form is not a URL and still names an origin. */
    it('accepts a url in the scp form', () => {
        const origin = {
            id: 'equipo-api',
            name: 'Equipo API',
            kind: 'remote',
            url: 'git@gitlab.com:equipo/api.git',
        };

        expect(originSchema.parse(origin)).toEqual(origin);
    });

    it('rejects a url whose scheme cannot name an origin', () => {
        expect(() =>
            originSchema.parse({ id: 'x', name: 'X', kind: 'remote', url: 'http://a.com/b.git' }),
        ).toThrow();
    });

    it('rejects a string that is no url at all', () => {
        expect(() =>
            originSchema.parse({ id: 'x', name: 'X', kind: 'remote', url: 'equipo/api' }),
        ).toThrow();
    });

    it('rejects a kind outside the closed table', () => {
        expect(() => originSchema.parse({ id: 'x', name: 'X', kind: 'shared' })).toThrow();
    });

    it('rejects a name containing only whitespace', () => {
        expect(() => originSchema.parse({ id: 'x', name: '   ', kind: 'local' })).toThrow();
    });

    /** The directory of an origin belongs to main: nothing here can carry it to a window. */
    it('has no field for a path, a branch or a head', () => {
        expect(Object.keys(originSchema.shape).sort()).toEqual(['id', 'kind', 'name', 'url']);
    });
});
