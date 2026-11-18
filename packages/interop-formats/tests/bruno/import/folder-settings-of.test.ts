import { degradation } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { folderSettingsOf } from '../../../src/bruno/import/folder-settings-of.js';
import { folderNode, rowOf } from '../support/trees.js';

const VARIABLE = { name: 'zona', value: 'eu', disabled: false, secret: false };

describe('folderSettingsOf', () => {
    it('says nothing of a level that says nothing', () => {
        const { settings, degradations } = folderSettingsOf(folderNode(), 'folder');

        expect(Object.values(settings).filter((value) => value !== undefined)).toEqual([]);
        expect(degradations).toEqual([]);
    });

    it('takes the four settings of a level, with no line', () => {
        const { settings, degradations } = folderSettingsOf(
            folderNode({
                description: 'Notas',
                variables: [VARIABLE],
                auth: { type: 'bearer', token: '{{t}}' },
                headers: [rowOf('X-A', '1'), rowOf('X-B', '2', { disabled: true })],
            }),
            'collection',
        );

        expect(settings).toEqual({
            description: 'Notas',
            variables: [{ name: 'zona', value: 'eu', enabled: true, secret: false }],
            auth: { type: 'bearer', token: '{{t}}' },
            headers: [
                { key: 'X-A', value: '1', enabled: true },
                { key: 'X-B', value: '2', enabled: false },
            ],
        });
        expect(degradations).toEqual([]);
    });

    it('lets a secret in blank and plain, saying where its value belongs', () => {
        const { settings, degradations } = folderSettingsOf(
            folderNode({ variables: [{ ...VARIABLE, secret: true }] }),
            'folder',
        );

        expect(settings.variables).toEqual([
            { name: 'zona', value: '', enabled: true, secret: false },
        ]);
        expect(degradations).toEqual([
            degradation('secretFolderVariableNotImported', { name: 'zona' }),
        ]);
    });

    it('says what it cannot hold of the auth, in the place it stands', () => {
        const { settings, degradations } = folderSettingsOf(
            folderNode({ auth: { type: 'digest' } }),
            'collection',
        );

        expect(settings.auth).toEqual({ type: 'none' });
        expect(degradations).toEqual([
            degradation('authNoEquivalentCollection', { type: 'digest' }),
        ]);
    });
});
