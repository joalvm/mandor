import { degradation } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { folderSettingsOf } from '../../../src/insomnia/import/folder-settings-of.js';
import { folderNode, rowOf } from '../support/trees.js';

describe('folderSettingsOf', () => {
    it('says nothing of a folder that says nothing', () => {
        const { settings, degradations } = folderSettingsOf(folderNode());

        expect(Object.values(settings).filter((value) => value !== undefined)).toEqual([]);
        expect(degradations).toEqual([]);
    });

    it('takes the four settings of a request group, with no line', () => {
        const { settings, degradations } = folderSettingsOf(
            folderNode({
                description: 'Notas',
                environment: { zona: 'eu' },
                authentication: { type: 'bearer', token: '{{ _.token }}' },
                headers: [rowOf('X-A', '{{ _.zona }}'), rowOf('X-B', '1', { disabled: true })],
            }),
        );

        expect(settings).toEqual({
            description: 'Notas',
            variables: [{ name: 'zona', value: 'eu', enabled: true, secret: false }],
            auth: { type: 'bearer', token: '{{token}}' },
            headers: [
                { key: 'X-A', value: '{{zona}}', enabled: true },
                { key: 'X-B', value: '1', enabled: false },
            ],
        });
        expect(degradations).toEqual([]);
    });

    it('flattens the environment of a folder like any other', () => {
        const { settings, degradations } = folderSettingsOf(
            folderNode({ environment: { zona: 'eu', hondo: { a: 1 } } }),
        );

        expect(settings.variables?.map(({ name }) => name)).toEqual(['zona']);
        expect(degradations).toEqual([degradation('variableIsObject', { name: 'hondo' })]);
    });

    it('leaves the words of a description alone', () => {
        const { settings, degradations } = folderSettingsOf(
            folderNode({ description: 'Usa {% uuid %}' }),
        );

        expect(settings.description).toBe('Usa {% uuid %}');
        expect(degradations).toEqual([]);
    });

    it('puts the scripts of a folder in their moments, with nothing to say', () => {
        const { settings, degradations } = folderSettingsOf(
            folderNode({ scripts: { preRequest: '', afterResponse: 'b({{ _.c }});' } }),
        );

        expect(settings.scripts).toEqual({ onResponse: { source: 'b({{ _.c }});' } });
        expect(degradations).toEqual([]);
    });
});
