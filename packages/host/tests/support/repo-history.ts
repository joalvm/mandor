import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);

async function git(root: string, args: string[]): Promise<string[]> {
    const { stdout } = await exec('git', args, { cwd: root });

    return stdout.split('\n').filter((line) => line !== '');
}

/** The subject of the newest commit, which is how the history names what the app just did. */
export async function lastSubject(root: string): Promise<string | undefined> {
    return (await git(root, ['log', '-1', '--pretty=%s'])).at(0);
}

/** The paths the newest commit touched, sorted, a move as the path leaving and the one arriving. */
export async function lastFiles(root: string): Promise<string[]> {
    return (await git(root, ['show', '--no-renames', '--name-only', '--pretty=format:'])).sort();
}

/** Paths git still sees as changed or new: empty when every write of the app is committed. */
export function dirtyFiles(root: string): Promise<string[]> {
    return git(root, ['status', '--porcelain']);
}

/** Every subject of the history, newest first: the order the user acted in. */
export function subjects(root: string): Promise<string[]> {
    return git(root, ['log', '--pretty=%s']);
}

/** How many commits the history has, for a test that must show a write made none. */
export async function commitCount(root: string): Promise<number> {
    return Number((await git(root, ['rev-list', '--count', 'HEAD'])).at(0));
}
