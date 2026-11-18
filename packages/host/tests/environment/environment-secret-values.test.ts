import { createEnvironment } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { environmentSecretValues } from '../../src/environment/environment-secret-values.js';

const place = { repo: 'repo-1', workspaceId: 'payments', environmentId: 'staging' };

const environment = createEnvironment({
    id: 'staging',
    name: 'Staging',
    variables: [
        { name: 'token', value: '', enabled: true, secret: true },
        { name: 'other', value: '', enabled: true, secret: true },
        { name: 'host', value: 'api.test', enabled: true, secret: false },
        { name: 'off', value: '', enabled: false, secret: true },
    ],
});

describe('environmentSecretValues', () => {
    it('reads only the secret variables that are on, one key each', async () => {
        const asked: string[] = [];
        const values = await environmentSecretValues(
            (key) => {
                asked.push(key);

                return Promise.resolve(`value-of-${key}`);
            },
            place,
            environment,
        );

        expect(Object.keys(values)).toEqual(['token', 'other']);
        expect(asked).toHaveLength(2);
    });

    it('leaves out a name the machine keeps nothing for, or keeps empty', async () => {
        const values = await environmentSecretValues(
            (key) => Promise.resolve(key.endsWith('token') ? 'kept' : ''),
            place,
            environment,
        );

        expect(values).toEqual({ token: 'kept' });
    });

    it('treats a locked keyring as nothing kept instead of failing', async () => {
        const values = await environmentSecretValues(
            () => Promise.reject(new Error('locked')),
            place,
            environment,
        );

        expect(values).toEqual({});
    });
});
