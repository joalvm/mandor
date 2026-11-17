import { describe, expect, it } from 'vitest';

import { originOf } from '../../../src/insomnia/import/origin-of.js';

describe('originOf', () => {
    it('is an origin of Insomnia with the source and the fingerprint', () => {
        expect(originOf('workspace:w', 'abc')).toEqual({
            kind: 'insomnia',
            sourceId: 'workspace:w',
            fingerprint: 'abc',
        });
    });
});
