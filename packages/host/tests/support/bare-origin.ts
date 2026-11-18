import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

import { ensureLocalRepo } from '../../src/repo/ensure-local-repo.js';

const exec = promisify(execFile);

/** A bare repo on disk standing in for the server of an origin, and the url that names it. */
export type BareOrigin = { path: string; url: string };

export async function bareOrigin(base: string, name: string): Promise<BareOrigin> {
    const path = join(base, `${name}.git`);

    await mkdir(path, { recursive: true });
    await exec('git', ['init', '--bare', '-b', 'main'], { cwd: path });

    return { path, url: pathToFileURL(path).toString() };
}

/** Puts what Mandor's own repo holds on the bare repo, as another machine of the user did. */
export async function publishMandorRepo(
    base: string,
    bare: BareOrigin,
    name: string,
): Promise<void> {
    const root = join(base, `${name}-source`);

    await ensureLocalRepo({ kind: 'async', name, root, workspaceName: 'Del remoto' });
    await exec('git', ['push', bare.url, 'main:main'], { cwd: root });
}

/** Puts a commit with a stranger's file on the bare repo: it is content, but not Mandor's. */
export async function publishForeignFile(base: string, bare: BareOrigin): Promise<void> {
    const root = join(base, 'foreign-source');
    const git = (...args: string[]): Promise<unknown> => exec('git', args, { cwd: root });

    await mkdir(root, { recursive: true });
    await git('init', '-b', 'main');
    await writeFile(join(root, 'README.md'), 'not ours\n', 'utf8');
    await git('add', '.');
    await git('-c', 'user.name=Other', '-c', 'user.email=o@example.test', 'commit', '-m', 'readme');
    await git('push', bare.url, 'main:main');
}

/** The subjects of what the bare repo holds, newest first. */
export async function bareLog(bare: BareOrigin): Promise<string[]> {
    const { stdout } = await exec('git', ['log', '--pretty=%s', 'main'], { cwd: bare.path });

    return stdout.split('\n').filter((line) => line !== '');
}
