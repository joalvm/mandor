import { describe, expect, it } from 'vitest';

import { composeScope, resolveText } from '../../src/index.js';

describe('composeScope', () => {
    it('orders the four levels from strongest to weakest', () => {
        const scope = composeScope({
            script: { host: 'from-script' },
            environment: { host: 'from-environment' },
            globals: { host: 'from-globals' },
            dynamic: { host: 'from-dynamic' },
        });

        expect(scope.map((level) => level.name)).toEqual([
            'script',
            'environment',
            'globals',
            'dynamic',
        ]);
    });

    it('keeps the four levels present and empty when nothing provides values', () => {
        const scope = composeScope({});

        expect(scope).toEqual([
            { name: 'script', values: {}, secret: [] },
            { name: 'environment', values: {}, secret: [] },
            { name: 'globals', values: {}, secret: [] },
            { name: 'dynamic', values: {}, secret: [] },
        ]);
    });

    /**
     * Secrecy is declared on the variables of an environment, which is the only level whose
     * values come from a declaration the user wrote. The rest carry the field empty.
     */
    it('marks as secret the names the environment declared secret', () => {
        const scope = composeScope({ environment: { TOKEN: 'tok_abcdefgh' }, secret: ['TOKEN'] });

        expect(scope.map((level) => level.secret)).toEqual([[], ['TOKEN'], [], []]);
    });

    /** The script level exists and stays empty until scripts land, and still wins. */
    it('lets the script level win over every other level when it has a value', () => {
        const scope = composeScope({
            script: { host: 'from-script' },
            environment: { host: 'from-environment' },
        });

        expect(resolveText('{{host}}', scope).text).toBe('from-script');
    });
});

describe('composeScope with a folder chain', () => {
    const chain = [
        { level: 'folder', name: 'Hoy', values: { level: 'subcarpeta' } },
        { level: 'folder', name: 'Altas', values: { level: 'carpeta' } },
        { level: 'collection', name: 'Pagos', values: { level: 'coleccion', base: 'b' } },
    ] as const;

    function winner(values: Parameters<typeof composeScope>[0]): string {
        return resolveText('{{level}}', composeScope(values)).text;
    }

    /** The order of Bruno and Insomnia: the closest folder, then the environment, then the collection. */
    it.each([
        ['subfolder, folder, environment, collection, workspace', chain, true, 'subcarpeta'],
        ['no folders', chain.slice(2), true, 'entorno'],
        ['no folders and no environment', chain.slice(2), false, 'coleccion'],
        ['only the globals', [], false, 'globals'],
    ] as const)(
        'with %s, the value comes from the strongest',
        (_case, levels, withEnv, expected) => {
            expect(
                winner({
                    chain: levels,
                    ...(withEnv ? { environment: { level: 'entorno' } } : {}),
                    globals: { level: 'globals' },
                }),
            ).toBe(expected);
        },
    );

    it('puts folders above the environment and the collection below it, each with its name', () => {
        const scope = composeScope({ chain });

        expect(scope.map((level) => [level.name, level.label])).toEqual([
            ['script', undefined],
            ['folder', 'Hoy'],
            ['folder', 'Altas'],
            ['environment', undefined],
            ['collection', 'Pagos'],
            ['globals', undefined],
            ['dynamic', undefined],
        ]);
    });

    it('keeps a folder value that names a secret of the environment secret', () => {
        const scope = composeScope({
            chain: [{ level: 'folder', name: 'Hoy', values: { auth: 'Bearer {{token}}' } }],
            environment: { token: 'tok_abcdefgh' },
            secret: ['token'],
        });
        const result = resolveText('{{auth}}', scope);

        expect(result.text).toBe('Bearer tok_abcdefgh');
        expect(result.used).toEqual([
            { name: 'auth', level: 'folder', secret: false },
            { name: 'token', level: 'environment', secret: true },
        ]);
    });
});

describe('composeScope with the globals of the origin', () => {
    it('puts them under the collection and keeps their secrets secret', () => {
        const scope = composeScope({
            environment: { host: 'env' },
            globals: { host: 'global', token: 'tok_abcdefgh' },
            globalsSecret: ['token'],
        });

        expect(resolveText('{{host}}', scope).text).toBe('env');
        expect(resolveText('{{token}}', scope).used).toEqual([
            { name: 'token', level: 'globals', secret: true },
        ]);
    });
});
