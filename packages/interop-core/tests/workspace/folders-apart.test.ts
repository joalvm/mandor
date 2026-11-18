import { describe, expect, it } from 'vitest';

import { withFoldersApart } from '../../src/workspace/folders-apart.js';
import type { WorkspaceData, WorkspaceFolderNode } from '../../src/workspace/workspace-data.js';

function level(name: string, folders: WorkspaceFolderNode[] = []): WorkspaceFolderNode {
    return { name, settings: { variables: [], headers: [] }, folders, items: [] };
}

function namesOf(collections: WorkspaceFolderNode[]): string[][] {
    const workspace: WorkspaceData = {
        name: 'Tienda',
        connections: [],
        environments: [],
        globals: [],
        docs: [],
        collections,
    };

    return withFoldersApart(workspace).collections.map(({ folders }) =>
        folders.map(({ name }) => name),
    );
}

describe('withFoldersApart', () => {
    it('leaves alone names nothing else says', () => {
        expect(namesOf([level('A', [level('x')]), level('B', [level('y')])])).toEqual([
            ['x'],
            ['y'],
        ]);
    });

    it('numbers a name that going by its collection does not free either', () => {
        expect(
            namesOf([level('A', [level('x'), level('B / x')]), level('B', [level('x')])]),
        ).toEqual([['x', 'B / x'], ['B / x 2']]);
    });

    it('does not count the name of a collection with no request of its own', () => {
        expect(namesOf([level('x', [level('x')])])).toEqual([['x']]);
    });
});
