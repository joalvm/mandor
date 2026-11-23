import { composeScope } from '@mandor/vars';
import { describe, expect, it } from 'vitest';

import { listedVariables } from '../src/lib/listed-variables.js';

describe('the variables a place lists for a script', () => {
    it('come once each from the level that wins, told apart by where they come from', () => {
        const scope = composeScope({
            chain: [
                { level: 'folder', name: 'Users', values: { page: '2' } },
                {
                    level: 'collection',
                    name: 'Shop',
                    values: { base: 'https://shop.test', page: '1' },
                },
            ],
            dynamic: { $guid: 'x' },
            environment: { base: 'https://env.test', token: 'abc' },
            globals: { region: 'eu' },
            script: { chained: '7' },
        });

        expect(listedVariables(scope, [])).toEqual([
            { name: 'chained', origin: 'script', secret: false, value: '7' },
            { name: 'page', origin: 'collection', secret: false, value: '2' },
            { name: 'base', origin: 'environment', secret: false, value: 'https://env.test' },
            { name: 'token', origin: 'environment', secret: false, value: 'abc' },
            { name: 'region', origin: 'environment', secret: false, value: 'eu' },
        ]);
    });

    it('mask the value of a secret and never list it in clear', () => {
        const scope = composeScope({
            environment: { token: 'a-very-long-secret-value' },
            globals: { key: 'k' },
            globalsSecret: ['key'],
            secret: ['token'],
        });
        const listed = listedVariables(scope, []);

        expect(listed).toEqual([
            { name: 'token', origin: 'environment', secret: true, value: '••••••••••••••' },
            { name: 'key', origin: 'environment', secret: true, value: '••••••' },
        ]);
        expect(JSON.stringify(listed)).not.toContain('a-very-long');
    });

    it('end with the names the scripts declare, once each and only when nothing holds them', () => {
        const scope = composeScope({ environment: { token: 'abc' } });

        expect(listedVariables(scope, ['id', 'token', 'trace', 'id'])).toEqual([
            { name: 'token', origin: 'environment', secret: false, value: 'abc' },
            { name: 'id', origin: 'script', secret: false, value: '' },
            { name: 'trace', origin: 'script', secret: false, value: '' },
        ]);
    });

    it('list nothing from a scope written by hand without secrets', () => {
        expect(listedVariables([{ name: 'environment', values: { a: '1' } }], [])).toEqual([
            { name: 'a', origin: 'environment', secret: false, value: '1' },
        ]);
        expect(listedVariables([], [])).toEqual([]);
    });
});
