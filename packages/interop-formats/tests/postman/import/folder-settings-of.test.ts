import { degradation } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { folderSettingsOf } from '../../../src/postman/import/folder-settings-of.js';

const VARIABLE = { name: 'zona', value: 'eu', enabled: true, secret: false };
const NOTE = degradation('folderVariablesWin');

describe('folderSettingsOf', () => {
    it('says nothing of a level that says nothing', () => {
        const { settings, degradations } = folderSettingsOf({ security: null }, {}, 'folder');

        expect(settings).toEqual({});
        expect(degradations).toEqual([]);
    });

    it('takes the variables of a collection with no row: Postman resolves them too', () => {
        const { settings, degradations } = folderSettingsOf(
            { variables: [VARIABLE], security: [] },
            {},
            'collection',
        );

        expect(settings.variables).toEqual([VARIABLE]);
        expect(degradations).toEqual([]);
    });

    it('takes the variables of a folder, saying where they now rank', () => {
        const { settings, degradations } = folderSettingsOf(
            { variables: [VARIABLE], security: null },
            {},
            'folder',
        );

        expect(settings.variables).toEqual([VARIABLE]);
        expect(degradations).toEqual([NOTE]);
    });

    it('lets a secret of a folder in blank and plain, saying where its value belongs', () => {
        const { settings, degradations } = folderSettingsOf(
            { variables: [{ ...VARIABLE, secret: true }], security: null },
            {},
            'folder',
        );

        expect(settings.variables).toEqual([{ ...VARIABLE, value: '', secret: false }]);
        expect(degradations).toContainEqual(
            degradation('secretFolderVariableNotImported', { name: 'zona' }),
        );
    });

    it('reads the auth of the level from the schemes of the document', () => {
        const { settings } = folderSettingsOf(
            { security: ['b'] },
            { b: { type: 'bearer', extras: { token: '{{t}}' } } },
            'folder',
        );

        expect(settings.auth).toEqual({ type: 'bearer', token: '{{t}}' });
    });

    it('keeps the scripts that are on as text', () => {
        const script = { event: 'onResponse', dialect: 'postman', source: 'x()' } as const;
        const { settings, degradations } = folderSettingsOf(
            { security: null, scripts: [{ ...script, enabled: true }] },
            {},
            'collection',
        );

        expect(settings.importedScripts).toEqual([script]);
        expect(degradations).toEqual([degradation('scriptAsText', { kind: 'test' })]);
    });

    it('rewrites a dynamic variable in a value, and leaves the words of a description alone', () => {
        const { settings, degradations } = folderSettingsOf(
            {
                description: 'Usa {{$guid}}',
                variables: [
                    { ...VARIABLE, value: '{{$guid}}' },
                    { ...VARIABLE, name: 'b', value: '{{$raro}}' },
                ],
                security: null,
            },
            {},
            'collection',
        );

        expect(settings.description).toBe('Usa {{$guid}}');
        expect(settings.variables?.map(({ value }) => value)).toEqual(['{{$uuid}}', '{{$raro}}']);
        expect(degradations).toEqual([
            degradation('dynamicVariableUnsupported', { name: '$raro' }),
        ]);
    });
});
