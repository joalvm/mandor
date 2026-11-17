import type { FolderChainLevel } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import type { EnvironmentScope } from '../../src/environment/environment-scope.js';
import { variableSnapshot } from '../../src/script/variable-snapshot.js';

const FOLDER: FolderChainLevel = {
    level: 'folder',
    place: { kind: 'folder', path: 'orders' },
    name: 'Orders',
    settings: {
        variables: [
            { name: 'path', value: '/orders', enabled: true, secret: false },
            { name: 'off', value: 'x', enabled: false, secret: false },
        ],
    },
};

const SCOPE: EnvironmentScope = {
    environment: null,
    values: { base: 'https://api.test', auth: 'Bearer {{token}}', url: '{{base}}{{path}}' },
    secrets: { token: 's3cr3t' },
    globals: { values: { region: 'eu' }, secrets: { key: 'k3y' } },
    chain: [FOLDER],
};

function byName(list: ReturnType<typeof variableSnapshot>): Record<string, unknown> {
    return Object.fromEntries(list.map(({ name, ...rest }) => [name, rest]));
}

describe('variableSnapshot', () => {
    it('gives every name of the send once, as it resolves, and only the name of a secret', () => {
        expect(byName(variableSnapshot(SCOPE, {}))).toEqual({
            base: { value: 'https://api.test' },
            url: { value: 'https://api.test/orders' },
            path: { value: '/orders' },
            region: { value: 'eu' },
            token: { withheld: true },
            key: { withheld: true },
            auth: { value: 'Bearer {{token}}' },
        });
    });

    it('never carries the value of a secret, inside another value or alone', () => {
        const text = JSON.stringify(variableSnapshot(SCOPE, { built: '{{token}}-{{key}}' }));

        expect(text).not.toContain('s3cr3t');
        expect(text).not.toContain('k3y');
        expect(text).toContain('{{token}}-{{key}}');
    });

    it('puts what scripts set on top of every level, as a plain value', () => {
        const snapshot = byName(
            variableSnapshot(SCOPE, { base: 'https://other.test', token: 't' }),
        );

        expect(snapshot['base']).toEqual({ value: 'https://other.test' });
        expect(snapshot['url']).toEqual({ value: 'https://other.test/orders' });
        expect(snapshot['token']).toEqual({ value: 't' });
    });

    it('leaves out the values made for each send and a variable switched off', () => {
        const names = variableSnapshot(SCOPE, {}).map(({ name }) => name);

        expect(names).not.toContain('off');
        expect(names.some((name) => name.startsWith('$'))).toBe(false);
    });
});
