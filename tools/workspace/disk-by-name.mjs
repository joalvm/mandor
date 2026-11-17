import { execFile } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { join, posix, relative } from 'node:path';
import { promisify } from 'node:util';

import { parseDocument } from 'yaml';

const run = promisify(execFile);

/** The files of a group of the tree that are the group itself and not one of its items. */
const NOT_ITEMS = new Set(['collection.yaml', 'folder.yaml', 'collections.yaml']);

/** The files that define a group of the tree: the collection at the top, a folder below. */
const DEFINITIONS = ['collection.yaml', 'folder.yaml'];

const WORKSPACE_FILE = /^workspaces\/[^/]+\/workspace\.yaml$/u;

/** The block a doc opens with: `---`, its YAML, `---`. */
const FRONT_MATTER = /^---\r?\n(?:([\s\S]*?)\r?\n)?---(?:\r?\n|$)/u;

/** What git answers over a bare repo. */
async function git(bare, args) {
    const { stdout } = await run('git', ['--git-dir', bare, ...args], {
        maxBuffer: 64 * 1024 * 1024,
    });

    return stdout;
}

/** The disk of one repo: every file under `workspaces/`, by path from the root of the repo. */
export function diskTree(repoRoot) {
    return {
        async list() {
            const entries = await readdir(join(repoRoot, 'workspaces'), {
                recursive: true,
                withFileTypes: true,
            }).catch(() => []);

            return entries
                .filter((entry) => entry.isFile())
                .map((entry) =>
                    relative(repoRoot, join(entry.parentPath, entry.name)).replaceAll('\\', '/'),
                )
                .sort();
        },
        read(path) {
            return readFile(join(repoRoot, path), 'utf8');
        },
    };
}

/** The tip of a branch of a shared repo; a branch that does not exist yet has no files. */
export function bareTree(bare, branch = 'main') {
    return {
        async list() {
            try {
                const out = await git(bare, [
                    'ls-tree',
                    '-r',
                    '--full-tree',
                    '--name-only',
                    '-z',
                    branch,
                ]);

                return out
                    .split('\0')
                    .filter((path) => path !== '')
                    .sort();
            } catch {
                return [];
            }
        },
        read(path) {
            return git(bare, ['show', `${branch}:${path}`]);
        },
    };
}

/** One key of a YAML text read softly: a text that does not parse, or has no such string, says `''`. */
function softString(text, key) {
    try {
        const value = parseDocument(text).get(key);

        return typeof value === 'string' ? value : '';
    } catch {
        return '';
    }
}

async function nameOf(tree, path) {
    const text = await tree.read(path).catch(() => '');

    return softString(text, 'name');
}

/** The paths below a directory, relative to it. */
function belowDir(paths, dir) {
    const prefix = `${dir}/`;

    return paths.filter((path) => path.startsWith(prefix)).map((path) => path.slice(prefix.length));
}

function directFiles(paths, dir) {
    return belowDir(paths, dir)
        .filter((path) => !path.includes('/'))
        .map((path) => `${dir}/${path}`);
}

/** What a lookup found, or the failure that says what was not there: a spec cannot go on without it. */
export function onDisk(found, what) {
    if (found === null) {
        throw new Error(`${what} is not on disk`);
    }

    return found;
}

/** The files that sit directly in a directory, by path from the root of the repo. */
export async function filesIn(tree, dir) {
    return directFiles(await tree.list(), dir);
}

/** The first file whose `name` is the one asked for, or `null`. */
async function firstNamed(tree, files, name) {
    for (const file of files) {
        if ((await nameOf(tree, file)) === name) {
            return file;
        }
    }

    return null;
}

/** Every workspace of the tree, each with the name its `workspace.yaml` carries. */
export async function workspaces(tree) {
    const files = (await tree.list()).filter((path) => WORKSPACE_FILE.test(path));

    return Promise.all(
        files.map(async (file) => ({
            dir: posix.dirname(file),
            name: await nameOf(tree, file),
        })),
    );
}

/** The directory of the first workspace with that name, or `null`. */
export async function workspaceNamed(tree, name) {
    const found = (await workspaces(tree)).find((workspace) => workspace.name === name);

    return found?.dir ?? null;
}

/** The `.yaml` file, directly in the directory, that carries that name; `null` when none does. */
export async function entityNamed(tree, dir, name) {
    const files = (await filesIn(tree, dir)).filter((file) => file.endsWith('.yaml'));

    return firstNamed(tree, files, name);
}

/** The subfolder of a directory whose definition file carries that name, or `null`. */
async function folderNamed(tree, paths, dir, name) {
    const folders = new Set(
        belowDir(paths, dir)
            .filter((path) => path.includes('/'))
            .map((path) => path.split('/')[0]),
    );

    for (const folder of [...folders].sort()) {
        const defining = DEFINITIONS.map((file) => `${dir}/${folder}/${file}`).filter((file) =>
            paths.includes(file),
        );

        if ((await firstNamed(tree, defining, name)) !== null) {
            return `${dir}/${folder}`;
        }
    }

    return null;
}

async function descend(tree, paths, dir, names) {
    let holder = dir;

    for (const name of names) {
        holder = await folderNamed(tree, paths, holder, name);

        if (holder === null) {
            return null;
        }
    }

    return holder;
}

/** The directory reached by going down a folder at a time by name, or `null`. */
export async function holderNamed(tree, collectionsDir, names) {
    return descend(tree, await tree.list(), collectionsDir, names);
}

/** The item file named by the last of the names, inside the holder the others name; or `null`. */
export async function itemNamed(tree, collectionsDir, names) {
    const paths = await tree.list();
    const holder = await descend(tree, paths, collectionsDir, names.slice(0, -1));

    if (holder === null) {
        return null;
    }

    const items = directFiles(paths, holder).filter(
        (file) => file.endsWith('.yaml') && !NOT_ITEMS.has(posix.basename(file)),
    );

    return firstNamed(tree, items, names.at(-1));
}

/** The title of a doc: the one in its front matter, or its file name without `.md`. */
function titleOfText(text, file) {
    const front = FRONT_MATTER.exec(text);
    const title = front === null ? '' : softString(front[1] ?? '', 'title');

    return title === '' ? posix.basename(file, '.md') : title;
}

/** The `.md` file, directly in the directory, that goes by that title; `null` when none does. */
export async function docTitled(tree, docsDir, title) {
    const files = (await filesIn(tree, docsDir)).filter((file) => file.endsWith('.md'));

    for (const file of files) {
        const text = await tree.read(file).catch(() => '');

        if (titleOfText(text, file) === title) {
            return file;
        }
    }

    return null;
}
