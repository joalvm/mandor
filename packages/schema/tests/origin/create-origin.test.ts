import { describe, expect, it } from 'vitest';

import { createLocalOrigin, createOrigin, originSchema } from '../../src/index.js';

describe('createOrigin', () => {
    it('keeps the id it was given and passes its own schema', () => {
        const origin = createOrigin({
            id: 'h7m2k9q4w1x3',
            name: 'Equipo API',
            url: 'https://github.com/equipo/api.git',
        });

        expect(origin).toEqual({
            id: 'h7m2k9q4w1x3',
            name: 'Equipo API',
            kind: 'remote',
            url: 'https://github.com/equipo/api.git',
        });
        expect(originSchema.parse(origin)).toEqual(origin);
    });

    it('is local work when it has no url', () => {
        expect(createOrigin({ id: 'h7m2k9q4w1x3', name: 'Mio' })).toEqual({
            id: 'h7m2k9q4w1x3',
            name: 'Mio',
            kind: 'local',
        });
    });
});

describe('createLocalOrigin', () => {
    it('is the origin with the reserved id', () => {
        expect(createLocalOrigin('Local')).toEqual({ id: 'local', name: 'Local', kind: 'local' });
    });
});
