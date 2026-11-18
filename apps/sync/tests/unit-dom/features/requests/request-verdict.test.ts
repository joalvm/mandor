import { describe, expect, it } from 'vitest';

import { bodyVerdict } from '../../../../src/renderer/features/requests/lib/request-verdict.js';

describe('the verdict of a body against its schema', () => {
    const schema = '{"type":"object","properties":{"name":{"type":"string"}}}';

    it('judges a json body against the schema written for it', () => {
        expect(bodyVerdict({ content: '{"name": 1}', type: 'json' }, schema)).toHaveLength(1);
        expect(bodyVerdict({ content: '{"name": "a"}', type: 'json' }, schema)).toEqual([]);
    });

    it('breaks nothing with no json body or no schema written', () => {
        expect(bodyVerdict({ content: '{"name": 1}', type: 'text' }, schema)).toEqual([]);
        expect(bodyVerdict({ content: '{"name": 1}', type: 'json' }, undefined)).toEqual([]);
        expect(bodyVerdict({ content: '{"name": 1}', type: 'json' }, ' ')).toEqual([]);
    });
});
