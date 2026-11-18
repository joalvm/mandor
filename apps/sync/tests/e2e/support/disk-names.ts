import { join } from 'node:path';

import { expect } from '@playwright/test';

import {
    diskTree,
    entityNamed,
    holderNamed,
    itemNamed,
    onDisk,
    workspaceNamed,
    type Tree,
} from '../../../../../tools/workspace/disk-by-name.mjs';

/** The workspace the app lays out by itself on the first run: the name the screen shows. */
export const PERSONAL = 'Personal';

/** The repo of the local origin of a run whose sandbox is `root`. */
export function localRepo(root: string): string {
    return join(root, 'origins', 'sync', 'local');
}

/**
 * Where a workspace lives in the repo, from the root of the repo: its directory is an id the app
 * drew, so it is found by the name the screen shows, once the app has written it.
 */
export async function workspaceDir(repoRoot: string, name: string): Promise<string> {
    const tree = diskTree(repoRoot);

    await expect.poll(() => workspaceNamed(tree, name)).not.toBeNull();

    return onDisk(await workspaceNamed(tree, name), `the workspace ${name}`);
}

/** The folder that holds the environments of a workspace, absolute, to read what the app wrote in it. */
export async function environmentsDir(repoRoot: string, name: string): Promise<string> {
    return join(repoRoot, await workspaceDir(repoRoot, name), 'environments');
}

/** The path, from the root of the repo, of a file of one workspace that a lookup finds. */
type Look = (tree: Tree, workspace: string) => Promise<string | null>;

/**
 * The text of a file of a workspace, found by the names it goes by; `''` while it is not there,
 * which is what a poll waits out: the app writes a file a moment after the keys.
 */
async function textInWorkspace(repoRoot: string, name: string, look: Look): Promise<string> {
    const tree = diskTree(repoRoot);
    const workspace = await workspaceNamed(tree, name);
    const path = workspace === null ? null : await look(tree, workspace);

    return path === null ? '' : tree.read(path).catch(() => '');
}

/** The file of a request, or of any item, by the names of the collection, its folders and itself. */
export async function itemText(
    repoRoot: string,
    workspace: string,
    names: readonly string[],
): Promise<string> {
    return textInWorkspace(repoRoot, workspace, (tree, dir) =>
        itemNamed(tree, `${dir}/collections`, names),
    );
}

/**
 * The file of a request, absolute, by the names of the collection, its folders and itself, for a
 * test that writes it the way a pull would: from outside the app, behind its back.
 */
export async function itemFile(
    repoRoot: string,
    workspace: string,
    names: readonly string[],
): Promise<string> {
    const tree = diskTree(repoRoot);

    await expect.poll(() => workspaceNamed(tree, workspace)).not.toBeNull();

    const dir = onDisk(await workspaceNamed(tree, workspace), `the workspace ${workspace}`);
    const path = await itemNamed(tree, `${dir}/collections`, names);

    return join(repoRoot, onDisk(path, `the item ${names.join('/')}`));
}

/** The definition file of a collection or a folder, which holds its auth and its order. */
export async function definitionText(
    repoRoot: string,
    workspace: string,
    names: readonly string[],
): Promise<string> {
    return textInWorkspace(repoRoot, workspace, async (tree, dir) => {
        const holder = await holderNamed(tree, `${dir}/collections`, names);

        if (holder === null) {
            return null;
        }

        const files = await tree.list();
        const definition = ['collection.yaml', 'folder.yaml'].map((file) => `${holder}/${file}`);

        return definition.find((file) => files.includes(file)) ?? null;
    });
}

export async function environmentText(
    repoRoot: string,
    workspace: string,
    name: string,
): Promise<string> {
    return textInWorkspace(repoRoot, workspace, (tree, dir) =>
        entityNamed(tree, `${dir}/environments`, name),
    );
}

/** The `workspace.yaml` of a workspace: its variables and its auth. */
export async function workspaceText(repoRoot: string, workspace: string): Promise<string> {
    return textInWorkspace(repoRoot, workspace, (_tree, dir) =>
        Promise.resolve(`${dir}/workspace.yaml`),
    );
}
