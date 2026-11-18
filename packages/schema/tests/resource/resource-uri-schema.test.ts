import { describe, expect, it } from 'vitest';

import { resourceUriSchema } from '../../src/index.js';

describe('resourceUriSchema', () => {
    it('accepts every shape a resource can take', () => {
        expect(resourceUriSchema.parse('mandor://mi-repo/mi-ws/doc/guias/inicio.md')).toBe(
            'mandor://mi-repo/mi-ws/doc/guias/inicio.md',
        );
        expect(resourceUriSchema.parse('mandor://mi-repo/settings')).toBe(
            'mandor://mi-repo/settings',
        );
        expect(resourceUriSchema.parse('mandor://_app/welcome')).toBe('mandor://_app/welcome');
    });

    it('refuses text that names nothing Mandor can open', () => {
        expect(resourceUriSchema.safeParse('mandor://r/w/doc/a/../../../fuera.md').success).toBe(
            false,
        );
        expect(resourceUriSchema.safeParse('https://example.com').success).toBe(false);
        expect(resourceUriSchema.safeParse(7).success).toBe(false);
    });
});
