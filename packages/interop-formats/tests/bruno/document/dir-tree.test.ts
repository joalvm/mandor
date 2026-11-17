import { describe, expect, it } from 'vitest';

import { dirTreeOf } from '../../../src/bruno/document/dir-tree.js';

function file(path: string) {
    return { path, text: path };
}

describe('dirTreeOf', () => {
    it('lists the files of the root and the directories under it', () => {
        const tree = dirTreeOf(
            [file('a.yml'), file('Mascotas/b.yml'), file('Mascotas/Perros/c.yml')],
            'folder.yml',
        );

        expect(tree.files.map((each) => each.path)).toEqual(['a.yml']);
        expect(tree.dirs.map((dir) => dir.name)).toEqual(['Mascotas']);
        expect(tree.dirs[0]?.files.map((each) => each.path)).toEqual(['Mascotas/b.yml']);
        expect(tree.dirs[0]?.dirs[0]?.name).toBe('Perros');
    });

    it('takes the file that describes a folder as its own and not as one of its items', () => {
        const tree = dirTreeOf([file('Mascotas/folder.yml'), file('Mascotas/b.yml')], 'folder.yml');

        expect(tree.dirs[0]?.folder?.path).toBe('Mascotas/folder.yml');
        expect(tree.dirs[0]?.files.map((each) => each.path)).toEqual(['Mascotas/b.yml']);
    });

    it('joins the files of one directory in one node', () => {
        const tree = dirTreeOf([file('M/a.yml'), file('M/b.yml')], 'folder.yml');

        expect(tree.dirs).toHaveLength(1);
        expect(tree.dirs[0]?.files).toHaveLength(2);
    });

    it('leaves a root with no folder file of its own', () => {
        expect(dirTreeOf([], 'folder.yml')).toEqual({
            name: '',
            folder: undefined,
            files: [],
            dirs: [],
        });
    });
});
