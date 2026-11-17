import { describe, expect, it } from 'vitest';

import { originOf } from '../../../src/postman/import/origin-of.js';

describe('originOf', () => {
    it('is the origin every resource of a Postman document shares', () => {
        expect(originOf('s', 'f')).toEqual({ kind: 'postman', sourceId: 's', fingerprint: 'f' });
    });
});
