import { describe, expect, it } from 'vitest';

import { createCspNonce } from '../../src/window/csp-nonce.js';

describe('the nonce the window signs its styles with', () => {
    it('is never the same twice, so one run cannot be replayed into another', () => {
        expect(createCspNonce()).not.toBe(createCspNonce());
    });

    /**
     * The value travels inside a policy header and inside an attribute of the document. Base64
     * is what both accept without escaping, and a quote inside it would end the source list.
     */
    it('spells itself in base64 and in nothing else', () => {
        expect(createCspNonce()).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
    });

    it('carries the sixteen bytes a guessable nonce is not worth', () => {
        expect(Buffer.from(createCspNonce(), 'base64')).toHaveLength(16);
    });
});
