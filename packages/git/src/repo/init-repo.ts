import { readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { run } from '../git/run.js';
import { commitAll } from './commit-all.js';
import { commitMessage } from './commit-message.js';
import { PRIVATE_DIR } from './private-dir.js';

/** Mandor names the first branch itself: what git would default to varies by machine. */
const BRANCH = 'main';

const IGNORE = { file: '.gitignore', rule: `${PRIVATE_DIR}/` };

/** Without this, a file touched on the other platform comes back as a whole-file diff. */
const ATTRIBUTES = { file: '.gitattributes', rule: '* text=auto eol=lf' };

/**
 * Leaves `root` as a repo with the hygiene Mandor depends on and nothing pending. A
 * directory that is already a repository is adopted, never reinitialised: its history and
 * its branch are the user's, and `git init` over them is a surprise nobody asked for.
 */
export async function initRepo(root: string): Promise<void> {
    await ensureRepo(root);
    await ensureRule(join(root, IGNORE.file), IGNORE.rule);
    await ensureRule(join(root, ATTRIBUTES.file), ATTRIBUTES.rule);
    await commitAll(root, commitMessage({ kind: 'init-repo' }));
}

async function ensureRepo(root: string): Promise<void> {
    const adopted = await isRepo(root);

    if (adopted) {
        return;
    }

    await run(['init', '-b', BRANCH], root);
}

function isRepo(root: string): Promise<boolean> {
    return stat(join(root, '.git')).then(
        () => true,
        () => false,
    );
}

/**
 * Adds the rule when it is absent, on its own line, and leaves everything else in place. A rule
 * is a whole line: a comment or another path that only mentions it would leave `.mandor/` out.
 */
async function ensureRule(file: string, rule: string): Promise<void> {
    const current = await readFile(file, 'utf8').catch(emptyWhenMissing);
    const present = current.split(/\r?\n/).some((line) => line.trim() === rule);

    if (present) {
        return;
    }

    await writeFile(file, `${endedWithNewline(current)}${rule}\n`, 'utf8');
}

/**
 * No file is an empty one. A file that is there and cannot be read — locked for a moment, out
 * of reach — is a failure: read as empty, it would be written back with only the new rule.
 */
function emptyWhenMissing(error: unknown): string {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return '';
    }

    throw error;
}

function endedWithNewline(text: string): string {
    if (text === '' || text.endsWith('\n')) {
        return text;
    }

    return `${text}\n`;
}
