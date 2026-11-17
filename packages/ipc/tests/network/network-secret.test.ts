import { describe, expect, it } from 'vitest';

import {
    networkChooseFileRequestSchema,
    networkChooseFileResultSchema,
    networkSecretRequestSchema,
} from '../../src/index.js';

describe('the secrets and the files of the network settings', () => {
    it('name the proxy or one certificate by its id, and take an empty value as a clear', () => {
        expect(
            networkSecretRequestSchema.safeParse({ target: { kind: 'proxy' }, value: 'pass' })
                .success,
        ).toBe(true);
        expect(
            networkSecretRequestSchema.safeParse({
                target: { kind: 'certificate', id: 'c1' },
                value: '',
            }).success,
        ).toBe(true);
        expect(
            networkSecretRequestSchema.safeParse({
                target: { kind: 'certificate', id: '../c1' },
                value: 'x',
            }).success,
        ).toBe(false);
    });

    /** The renderer never names a path: it says what the file is for, and the user picks it. */
    it('pick a file by what it is for, and answer the path or nothing', () => {
        expect(networkChooseFileRequestSchema.safeParse({ purpose: 'pfx' }).success).toBe(true);
        expect(
            networkChooseFileRequestSchema.safeParse({ purpose: 'pfx', path: '/etc/passwd' })
                .success,
        ).toBe(false);
        expect(networkChooseFileResultSchema.parse({ ok: true, value: null })).toEqual({
            ok: true,
            value: null,
        });
    });
});
