import { afterEach, describe, expect, it } from 'vitest';

import { cspNonce } from '../../src/lib/csp-nonce.js';

afterEach(() => {
    document.head.querySelector('meta[name="csp-nonce"]')?.remove();
});

/** Writes the tag the window is served with, which is where the value comes from. */
function declareNonce(value: string): void {
    const meta = document.createElement('meta');

    meta.name = 'csp-nonce';
    meta.content = value;
    document.head.append(meta);
}

describe('the nonce the window signs its style elements with', () => {
    it('is the one the window declares', () => {
        declareNonce('abc123');

        expect(cspNonce()).toBe('abc123');
    });

    /**
     * The dev server has no such tag: its policy opens inline styles instead. An empty string
     * is what the window reads as "do not sign", which is exactly right there.
     */
    it('is empty in a window that declares none', () => {
        expect(cspNonce()).toBe('');
    });
});
