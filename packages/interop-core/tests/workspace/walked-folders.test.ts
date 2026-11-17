import type { ConcreteAuth } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { walkedFolders } from '../../src/workspace/walked-folders.js';
import type { WorkspaceFolderNode } from '../../src/workspace/workspace-data.js';

const TOP: ConcreteAuth = { type: 'bearer', token: 'arriba' };
const NEAR: ConcreteAuth = { type: 'basic', username: 'ana', password: '' };

function folder(
    name: string,
    folders: WorkspaceFolderNode[] = [],
    auth?: ConcreteAuth,
): WorkspaceFolderNode {
    return { name, settings: { variables: [], auth, headers: [] }, folders, items: [] };
}

describe('walkedFolders', () => {
    it('lists every folder, parents first, by its names from the top down', () => {
        const walked = walkedFolders(
            [folder('a', [folder('b', [folder('c')])]), folder('d')],
            undefined,
        );

        expect(walked.map(({ path }) => path)).toEqual([['a'], ['a', 'b'], ['a', 'b', 'c'], ['d']]);
    });

    it('names the levels each folder hangs from, itself first and the given ones last', () => {
        const top = folder('top');
        const walked = walkedFolders([folder('a', [folder('b')])], undefined, [], [top]);

        expect(walked.map(({ levels }) => levels.map((level) => level.name))).toEqual([
            ['a', 'top'],
            ['b', 'a', 'top'],
        ]);
    });

    it('answers with the closest auth, and the one above when no folder declares any', () => {
        const walked = walkedFolders(
            [folder('a', [folder('b', [folder('c')], NEAR)]), folder('d')],
            TOP,
        );

        expect(walked.map(({ auth }) => auth)).toEqual([TOP, NEAR, NEAR, TOP]);
    });

    it('leaves what the folder declares as it was', () => {
        const [walked] = walkedFolders([folder('a')], TOP);

        expect(walked?.folder.settings.auth).toBeUndefined();
    });
});
