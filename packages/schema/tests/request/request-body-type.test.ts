import { describe, expect, it } from 'vitest';

import { REQUEST_BODY_TYPES } from '../../src/request/request-body-type.js';

describe('REQUEST_BODY_TYPES', () => {
    it('lists the kinds of body a request writes', () => {
        expect(REQUEST_BODY_TYPES).toEqual([
            'none',
            'json',
            'text',
            'xml',
            'urlencoded',
            'form',
            'binary',
            'graphql',
        ]);
    });
});
