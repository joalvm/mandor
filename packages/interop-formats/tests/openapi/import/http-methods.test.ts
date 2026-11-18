import { describe, expect, it } from 'vitest';

import { HTTP_METHODS } from '../../../src/openapi/import/http-methods.js';

describe('the methods a path item can carry', () => {
    it('are the eight the specification names, lowercase as the document writes them', () => {
        expect(HTTP_METHODS).toEqual([
            'get',
            'put',
            'post',
            'delete',
            'options',
            'head',
            'patch',
            'trace',
        ]);
    });
});
