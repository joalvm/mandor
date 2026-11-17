import { describe, expect, it } from 'vitest';

import { loopbackRedirectOf } from '../../src/export/loopback-redirect-of.js';

describe('loopbackRedirectOf', () => {
    it('writes the address Mandor receives the code on', () => {
        expect(loopbackRedirectOf(8085)).toBe('http://127.0.0.1:8085/');
    });

    it('writes none when no port is pinned', () => {
        expect(loopbackRedirectOf(undefined)).toBeUndefined();
    });
});
