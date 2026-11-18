import { mkdir, mkdtemp, rm, truncate, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { IdError } from '@mandor/schema';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { MAX_FILE_BYTES } from '../../src/disk/read-file-text.js';
import { createWorkspace, docsDir, writeRepoTree, listDocs, readDoc } from '../../src/index.js';

const WORKSPACE = 'eventos-de-pagos';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-'));

    await writeRepoTree(root, 'Mi repo');
    await createWorkspace(root, {
        id: 'eventos-de-pagos',
        name: 'Eventos de pagos',
        kind: 'async',
    });
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

async function writeDoc(name: string, text: string): Promise<void> {
    await mkdir(docsDir(root, WORKSPACE), { recursive: true });
    await writeFile(join(docsDir(root, WORKSPACE), name), text, 'utf8');
}

describe('listing the docs of a workspace', () => {
    it('returns each file with its title, sorted by title', async () => {
        await writeDoc('a1b2c3d4e5f6.md', '---\ntitle: Zeta\n---\n# Hola');
        await writeDoc('z9y8x7w6v5u4.md', '---\ntitle: Alfa\n---\n# Hola');

        expect(await listDocs(root, WORKSPACE)).toEqual([
            { name: 'z9y8x7w6v5u4.md', title: 'Alfa' },
            { name: 'a1b2c3d4e5f6.md', title: 'Zeta' },
        ]);
    });

    /** A doc written by hand has no front matter: the name of its file is the title it shows. */
    it('takes the file name as the title of a doc that names none', async () => {
        await writeDoc('readme.md', '# Readme');

        expect(await listDocs(root, WORKSPACE)).toEqual([{ name: 'readme.md', title: 'readme' }]);
    });

    it('breaks a tie of titles by file name', async () => {
        await writeDoc('b.md', '---\ntitle: Notas\n---\n');
        await writeDoc('a.md', '---\ntitle: Notas\n---\n');

        expect(await listDocs(root, WORKSPACE)).toEqual([
            { name: 'a.md', title: 'Notas' },
            { name: 'b.md', title: 'Notas' },
        ]);
    });

    it('returns nothing when the workspace has no docs folder yet', async () => {
        expect(await listDocs(root, WORKSPACE)).toEqual([]);
    });

    /** A folder that could not be read is not an empty one: the section would say the docs are gone. */
    it('fails when the docs folder cannot be read', async () => {
        await writeFile(docsDir(root, WORKSPACE), 'not a folder\n', 'utf8');

        await expect(listDocs(root, WORKSPACE)).rejects.toMatchObject({ code: 'ENOTDIR' });
    });

    /** The section opens what it lists, so anything it cannot open has no business being on it. */
    it('keeps a doc it cannot read in the list, with no title, beside the others', async () => {
        await writeDoc('legible.md', '# Legible\n');
        await writeDoc('enorme.md', '# Enorme\n');
        await truncate(join(docsDir(root, WORKSPACE), 'enorme.md'), MAX_FILE_BYTES + 1);

        await expect(listDocs(root, WORKSPACE)).resolves.toEqual([
            { name: 'enorme.md', title: '' },
            { name: 'legible.md', title: 'legible' },
        ]);
    });

    it('leaves out what is not one markdown file', async () => {
        await writeDoc('readme.md', '# Readme');
        await writeDoc('notes.txt', 'plain');
        await writeDoc('.hidden.md', 'hidden');
        await mkdir(join(docsDir(root, WORKSPACE), 'chapter.md'), { recursive: true });

        expect(await listDocs(root, WORKSPACE)).toEqual([{ name: 'readme.md', title: 'readme' }]);
    });
});

describe('reading one doc', () => {
    it('gives back the text on disk', async () => {
        await writeDoc('readme.md', '# Título\n\nCuerpo.\n');

        expect(await readDoc(root, WORKSPACE, 'readme.md')).toBe('# Título\n\nCuerpo.\n');
    });

    /** The name reaches `join`, so the gate is here and not at the window that asked. */
    it('refuses a name that walks out of the docs folder', async () => {
        await expect(readDoc(root, WORKSPACE, '../workspace.yaml')).rejects.toThrow(IdError);
    });

    it('fails when the doc is not there', async () => {
        await expect(readDoc(root, WORKSPACE, 'missing.md')).rejects.toThrow();
    });

    it('fails when the doc is past the size a file may have to be read', async () => {
        await writeDoc('readme.md', '# Título\n');
        await truncate(join(docsDir(root, WORKSPACE), 'readme.md'), MAX_FILE_BYTES + 1);

        await expect(readDoc(root, WORKSPACE, 'readme.md')).rejects.toThrow(/64 MiB/);
    });
});
