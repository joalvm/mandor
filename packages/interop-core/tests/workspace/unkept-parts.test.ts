import { describe, expect, it } from 'vitest';

import { type UnkeptParts, unkeptOf } from '../../src/workspace/unkept-parts.js';
import type {
    WorkspaceFolderNode,
    WorkspaceFolderSettings,
} from '../../src/workspace/workspace-data.js';

const EMPTY: WorkspaceFolderSettings = { variables: [], headers: [] };

const PHRASES: UnkeptParts = {
    description: 'noWorkspaceNotes',
    variables: 'noVariables',
    auth: 'authMovedDown',
    headers: 'headersMovedDown',
    folders: 'foldersFlattened',
};

function level(
    settings: Partial<WorkspaceFolderSettings>,
    folders: readonly WorkspaceFolderNode[] = [],
): WorkspaceFolderNode {
    return { name: 'nivel', settings: { ...EMPTY, ...settings }, folders, items: [] };
}

describe('what a format does not keep of a level', () => {
    it('says nothing of a level with nothing the format loses', () => {
        expect(unkeptOf(level({}), PHRASES)).toBeUndefined();
        expect(unkeptOf(level({ description: '' }), PHRASES)).toBeUndefined();
    });

    it('says nothing when the format keeps what the level holds', () => {
        expect(unkeptOf(level({ description: 'doc' }), { auth: 'authMovedDown' })).toBeUndefined();
    });

    it.each([
        ['description', level({ description: 'doc' }), 'noWorkspaceNotes'],
        [
            'variables',
            level({ variables: [{ name: 'a', value: '1', enabled: true, secret: false }] }),
            'noVariables',
        ],
        ['auth', level({ auth: { type: 'bearer', token: 't' } }), 'authMovedDown'],
        [
            'headers',
            level({ headers: [{ key: 'a', value: '1', enabled: true }] }),
            'headersMovedDown',
        ],
        ['folders', level({}, [level({})]), 'foldersFlattened'],
    ])('says the loss of %s when the level holds it', (_part, held, phrase) => {
        expect(unkeptOf(held, PHRASES)).toEqual([phrase]);
    });

    it('lists the loss of every part the level holds, in one order', () => {
        const held = level({ auth: { type: 'bearer', token: 't' }, description: 'doc' }, [
            level({}),
        ]);

        expect(unkeptOf(held, PHRASES)).toEqual([
            'noWorkspaceNotes',
            'authMovedDown',
            'foldersFlattened',
        ]);
    });

    it('tells a level that holds a variable switched off', () => {
        const parts = { disabledVariables: 'disabledVariablesDropped' } as const;
        const off = { name: 'a', value: '1', enabled: false, secret: false };
        const on = { ...off, enabled: true };

        expect(unkeptOf(level({ variables: [on] }), parts)).toBeUndefined();
        expect(unkeptOf(level({ variables: [on, off] }), parts)).toEqual([
            'disabledVariablesDropped',
        ]);
    });
});
