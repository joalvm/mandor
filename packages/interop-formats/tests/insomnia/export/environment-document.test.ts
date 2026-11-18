import { describe, expect, it } from 'vitest';

import { environmentsDocumentOf } from '../../../src/insomnia/export/environment-document.js';
import { insomniaIdOf } from '../../../src/insomnia/export/insomnia-id.js';
import { PROD, SECRET_VALUE } from '../support/sample-workspace.js';

describe('environmentsDocumentOf', () => {
    it('writes nothing when the workspace has neither variables nor environments', () => {
        expect(environmentsDocumentOf('Tienda', [], [])).toBeUndefined();
    });

    it('writes the variables of the workspace as the base environment', () => {
        const document = environmentsDocumentOf(
            'Tienda',
            [
                { name: 'region', value: 'eu', enabled: true, secret: false },
                { name: 'url', value: '{{region}}.test', enabled: true, secret: false },
            ],
            [],
        );

        expect(document).toEqual({
            name: 'Base Environment',
            meta: { id: insomniaIdOf('env', 'Tienda', 'base'), isPrivate: false },
            data: { region: 'eu', url: '{{ _.region }}.test' },
            subEnvironments: [],
        });
    });

    it('writes each environment as a sub environment, without the variables that are off', () => {
        const document = environmentsDocumentOf('Tienda', [], [PROD]);

        expect(document?.['subEnvironments']).toEqual([
            {
                name: 'Prod',
                meta: { id: insomniaIdOf('env', 'Tienda', 'sub', 'prod'), isPrivate: false },
                data: { baseUrl: 'https://api.test', token: '' },
            },
        ]);
    });

    it('does not let a secret out', () => {
        const document = environmentsDocumentOf(
            'Tienda',
            [{ name: 'key', value: SECRET_VALUE, enabled: true, secret: true }],
            [PROD],
        );

        expect(JSON.stringify(document)).not.toContain(SECRET_VALUE);
    });
});
