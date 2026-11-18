import { degradation } from '../../src/resource/degradation.js';
import { describe, expect, it } from 'vitest';

import { variablesOf } from '../../src/import/variables-of.js';

const SECRET_LOSS = {
    collection: 'secretCollectionVariableNotImported',
    folder: 'secretFolderVariableNotImported',
} as const;

describe('variablesOf', () => {
    it.each(['collection', 'folder'] as const)(
        'keeps a %s plain: its file goes to git, and it says where the value belongs',
        (place) => {
            const secret = { name: 'key', value: 'v', enabled: true, secret: true };

            expect(variablesOf([secret], place)).toEqual({
                variables: [{ name: 'key', value: '', enabled: true, secret: false }],
                degradations: [degradation(SECRET_LOSS[place], { name: 'key' })],
            });
        },
    );

    const variables = [
        { name: 'base', value: 'x', enabled: true, secret: false },
        { name: 'off', value: 'y', enabled: false, secret: false },
        { name: 'bad name', value: 'z', enabled: true, secret: false },
        { name: '$dyn', value: 'z', enabled: true, secret: false },
        { name: 'key', value: 'shh', enabled: true, secret: true },
    ];

    it('leaves out a name Mandor cannot use, and keeps the switch of the rest', () => {
        const result = variablesOf(variables.slice(0, 4), 'environment');

        expect(result.variables.map((each) => [each.name, each.enabled])).toEqual([
            ['base', true],
            ['off', false],
        ]);
        expect(result.degradations).toEqual([
            degradation('variableNameUnusable', { name: 'bad name' }),
            degradation('variableNameUnusable', { name: '$dyn' }),
        ]);
    });

    it('keeps a secret with its mark in an environment or the globals, and explains it in a collection', () => {
        expect(variablesOf(variables.slice(4), 'environment')).toEqual({
            variables: [{ name: 'key', value: 'shh', enabled: true, secret: true }],
            degradations: [],
        });
        expect(variablesOf(variables.slice(4), 'globals')).toEqual({
            variables: [{ name: 'key', value: 'shh', enabled: true, secret: true }],
            degradations: [],
        });
        expect(variablesOf(variables.slice(4), 'collection')).toEqual({
            variables: [{ name: 'key', value: '', enabled: true, secret: false }],
            degradations: [degradation('secretCollectionVariableNotImported', { name: 'key' })],
        });
        expect(variablesOf(undefined, 'collection')).toEqual({ variables: [], degradations: [] });
    });
});
