import { rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { afterAll, beforeAll } from 'vitest';

import { commitAll } from '../../src/repo/commit-all.js';
import { fetchRemote } from '../../src/repo/fetch-remote.js';
import { pushBranch } from '../../src/repo/push-branch.js';
import { cloneOf, commitFile, publishedRepo, urlOf } from './remote.js';
import { copiedRepo, removeRepo, type Repo } from './repo.js';

/** What a side does to files: a text writes it, `null` deletes it. */
export type Edits = Record<string, string | null>;

/** Two machines of one person: `mine` has not sent what it did, `theirs` has. */
export type Divergence = { repo: Repo; mine: string; theirs: string };

export const SEED = { 'a.txt': 'one\ntwo\nthree\n', 'b.txt': 'bee\n' } as const;

async function edit(root: string, edits: Edits, message: string): Promise<void> {
    for (const [name, text] of Object.entries(edits)) {
        if (text === null) {
            await rm(join(root, name));
        } else {
            await writeFile(join(root, name), text, 'utf8');
        }
    }

    await commitAll(root, message);
}

/**
 * Two machines that diverged, for every test of a file. Both sides start from the same two
 * files; `theirs` commits and sends, `mine` commits and has fetched, so its branch is one commit
 * ahead and one behind: the shape a merge exists for.
 *
 * The published repo, its two files and the clone of the other machine are built once, before
 * the first test; each call copies them and makes its own edits on the copy, so a test runs git
 * for what it does and not for the stage it starts on. Called at the top of the file, where hooks
 * register.
 */
export function divergences(): (mine: Edits, theirs: Edits) => Promise<Divergence> {
    let seeded: Divergence | null = null;

    beforeAll(async () => {
        seeded = await seededPair();
    });

    afterAll(async () => {
        if (seeded !== null) {
            await removeRepo(seeded.repo);
        }
    });

    return async (mine, theirs) => {
        if (seeded === null) {
            throw new Error('divergences hands out copies only once its repos are built');
        }

        return divergedFrom(await copyOf(seeded), mine, theirs);
    };
}

/** Both machines on the same two files, with nothing done on either yet. */
async function seededPair(): Promise<Divergence> {
    const repo = await publishedRepo();

    await commitFile(repo.root, 'a.txt', SEED['a.txt'], 'update a.txt');
    await commitFile(repo.root, 'b.txt', SEED['b.txt'], 'update b.txt');
    await pushBranch(repo.root, { url: urlOf(repo) });

    return { repo, mine: await cloneOf(repo, 'mine'), theirs: repo.root };
}

async function divergedFrom(pair: Divergence, mine: Edits, theirs: Edits): Promise<Divergence> {
    await edit(pair.theirs, theirs, 'theirs');
    await pushBranch(pair.theirs, { url: urlOf(pair.repo) });
    await edit(pair.mine, mine, 'mine');
    await fetchRemote(pair.mine, { url: urlOf(pair.repo) });

    return pair;
}

/** A copy of `pair` somewhere else, whose two machines name the remote where it lies now. */
async function copyOf(pair: Divergence): Promise<Divergence> {
    const { repo, moved } = await copiedRepo(pair.repo, [pair.mine]);

    return { repo, mine: moved(pair.mine), theirs: repo.root };
}
