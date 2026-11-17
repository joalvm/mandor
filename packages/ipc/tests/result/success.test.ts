import { describe, expect, it } from 'vitest';

import { success } from '../../src/index.js';

describe('success', () => {
    it('wraps the value in an Ok', () => {
        expect(success('listo')).toEqual({ ok: true, value: 'listo' });
    });

    it('carries an empty object when there is nothing to return', () => {
        expect(success({})).toEqual({ ok: true, value: {} });
    });
});
