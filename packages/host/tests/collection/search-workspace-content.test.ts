import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { searchWorkspaceContent } from '../../src/collection/search-workspace-content.js';

let root = '';

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-search-'));
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

async function write(path: string, text: string): Promise<string> {
    const file = join(root, 'workspaces', 'api', path);

    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, text, 'utf8');

    return file;
}

function search(query: string) {
    return searchWorkspaceContent(root, { repo: 'local', workspaceId: 'api', query });
}

describe('searching the content of a workspace', () => {
    it('finds the line of a doc and of an item, whatever the case of the query', async () => {
        await write('docs/intro.md', '# Intro\nthe Token goes here\n');
        await write('collections/login.yaml', 'name: login\nurl: /token\n');

        const hits = await search('TOKEN');

        expect(hits).toEqual(
            expect.arrayContaining([
                { line: 2, resource: 'mandor://local/api/doc/intro.md', source: 'doc' },
                { line: 2, resource: 'mandor://local/api/item/login', source: 'item' },
            ]),
        );
        expect(hits).toHaveLength(2);
    });

    /** The editor opens a doc on its body, so a line number counts from there and not from the title. */
    it('counts the lines of a doc from its body, and never finds the title it keeps in front', async () => {
        await write(
            'docs/k3m9x2q7a4bd.md',
            '---\ntitle: Token guide\n---\n# Intro\nthe Token goes here\n',
        );

        const hits = await search('token');

        expect(hits).toEqual([
            { line: 2, resource: 'mandor://local/api/doc/k3m9x2q7a4bd.md', source: 'doc' },
        ]);
    });

    it('finds a collection and a folder in their settings, never as an item', async () => {
        await write('collections/auth/collection.yaml', 'description: the token\n');
        await write('collections/auth/login/folder.yaml', 'variables:\n  - name: token\n');

        const hits = await search('token');

        expect(hits).toEqual(
            expect.arrayContaining([
                { line: 1, resource: 'mandor://local/api/folder/auth', source: 'folder' },
                { line: 2, resource: 'mandor://local/api/folder/auth/login', source: 'folder' },
            ]),
        );
        expect(hits).toHaveLength(2);
    });

    it('leaves out what the window cannot open: stray settings, environments, local state', async () => {
        await write('collections/auth/folder.yaml', 'name: token\n');
        await write('collections/collections.yaml', 'order: [token]\n');
        await write('environments/prod.yaml', 'token: x\n');
        await write('.mandor/state.yaml', 'token: x\n');

        await expect(search('token')).resolves.toEqual([]);
    });

    it('skips a file too big to be a note', async () => {
        await write('docs/huge.md', `token\n${'x'.repeat(1024 * 1024)}`);

        await expect(search('token')).resolves.toEqual([]);
    });

    /**
     * A repo that came from elsewhere could point a link at any folder of the machine. A junction
     * is the link Windows lets anyone make; elsewhere the kind is ignored and a plain link is made.
     */
    it('does not follow a link out of the workspace', async () => {
        const outside = join(root, 'secrets');

        await mkdir(outside);
        await writeFile(join(outside, 'secret.md'), 'token: the one of the machine\n', 'utf8');
        await mkdir(join(root, 'workspaces', 'api', 'docs'), { recursive: true });
        await symlink(outside, join(root, 'workspaces', 'api', 'docs', 'leak'), 'junction');

        await expect(search('token')).resolves.toEqual([]);
    });

    it('stops once it holds enough lines to show', async () => {
        await write('docs/many.md', Array.from({ length: 800 }, () => 'token').join('\n'));

        await expect(search('token')).resolves.toHaveLength(500);
    });
});
