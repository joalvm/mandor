import { describe, expect, it } from 'vitest';

import { fingerprintOf } from '../../src/plan/fingerprint-of.js';

describe('fingerprintOf', () => {
    it('answers the same fingerprint for the same content, whatever the key order', () => {
        const first = fingerprintOf({ name: 'pedido', payload: '', schema: '{}' });
        const second = fingerprintOf({ schema: '{}', payload: '', name: 'pedido' });

        expect(first).toBe(second);
    });

    it('answers a different fingerprint when anything in the content changed', () => {
        expect(fingerprintOf({ name: 'pedido', payload: 'x' })).not.toBe(
            fingerprintOf({ name: 'pedido', payload: 'y' }),
        );
    });

    it('walks into the nested values', () => {
        expect(fingerprintOf({ a: { b: 1, c: 2 } })).toBe(fingerprintOf({ a: { c: 2, b: 1 } }));
        expect(fingerprintOf({ a: { b: 1 } })).not.toBe(fingerprintOf({ a: { b: 2 } }));
    });
});
