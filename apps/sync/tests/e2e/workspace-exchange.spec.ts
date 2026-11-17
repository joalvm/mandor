import { readFileSync } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test, type Page } from '@playwright/test';

import {
    diskTree,
    docTitled,
    entityNamed,
    holderNamed,
    workspaceNamed,
} from '../../../../tools/workspace/disk-by-name.mjs';
import { exportWorkspace, importWorkspace, openWorkspacesPanel } from './support/exchange-flow.js';
import { launch, makeSandbox } from './support/launch-app.js';

const FIXTURE = readFileSync(
    fileURLToPath(
        new URL(
            '../../../../packages/interop-formats/tests/mandor/fixtures/sync-workspace.mandor.yaml',
            import.meta.url,
        ),
    ),
    'utf8',
);

/** What the workspace of the fixture holds, found off the disk of the run by the names it goes by. */
async function expectOnDisk(repoRoot: string, workspaceName: string): Promise<void> {
    const tree = diskTree(repoRoot);

    await expect
        .poll(async () => {
            const dir = await workspaceNamed(tree, workspaceName);

            if (dir === null) {
                return false;
            }

            const found = await Promise.all([
                holderNamed(tree, `${dir}/collections`, ['Mascotas']),
                entityNamed(tree, `${dir}/environments`, 'Prod'),
                docTitled(tree, `${dir}/docs`, 'leeme'),
            ]);

            return found.every((path) => path !== null);
        })
        .toBe(true);
}

/** The file the export wrote says everything the workspace holds, and no secret among it. */
function expectWorkspaceCarries(text: string): void {
    expect(text).toContain('app: sync');
    expect(text).toContain('name: Tienda de Mascotas');
    expect(text).toContain('name: Mascotas');
    expect(text).toContain('name: listaMascotas');
    expect(text).toContain('name: borrarMascota');
    expect(text).toContain('name: Prod');
    expect(text).toContain('name: leeme.md');
    expect(text).toContain('baseUrl');
    // The secret travels as a name with nothing in it: the value stays on the machine.
    expect(text).not.toMatch(/value: \S*secret/iu);
}

/** The panel of the workspaces, with the file dropped in: the new workspace is the open one. */
async function bringWorkspaceIn(page: Page): Promise<void> {
    await openWorkspacesPanel(page, 'Personal');
    await importWorkspace(page, FIXTURE);

    await expect(
        page.getByRole('button', { exact: true, name: 'Tienda de Mascotas' }),
    ).toBeVisible();
}

/**
 * The trip of a whole workspace in Sync: an Mandor file comes in through the list of workspaces
 * and becomes a workspace of its own, goes out again from the page of the workspaces, and the
 * file it wrote comes in a second time without touching the first.
 */
test('a workspace file comes in as a new workspace, goes out whole and comes in again beside it', async () => {
    const { defaultRepoRoot, repoRoot, root, userDataDir } = await makeSandbox();
    const exportsDir = join(root, 'exports');

    await mkdir(join(root, 'origins'), { recursive: true });
    await mkdir(exportsDir, { recursive: true });

    const { app, page } = await launch(userDataDir, defaultRepoRoot, {
        MANDOR_SAVE_DIR: exportsDir,
    });

    try {
        await expect(page.getByRole('button', { name: 'Personal', exact: true })).toBeVisible();

        await bringWorkspaceIn(page);
        await expectOnDisk(repoRoot, 'Tienda de Mascotas');

        // Out it goes: the page of the workspaces offers the open workspace, whole.
        const exported = await exportWorkspace(
            page,
            { file: 'tienda-de-mascotas.mandor.yaml', name: 'Tienda de Mascotas' },
            exportsDir,
        );

        expectWorkspaceCarries(exported);

        // And again in: the file the export wrote asks for a new workspace, never the open one,
        // so the name it brings is taken and the second lands beside the first.
        await openWorkspacesPanel(page, 'Tienda de Mascotas');
        await importWorkspace(page, exported);

        await expect(
            page.getByRole('button', { exact: true, name: 'Tienda de Mascotas (2)' }),
        ).toBeVisible();
        await expectOnDisk(repoRoot, 'Tienda de Mascotas');
        await expectOnDisk(repoRoot, 'Tienda de Mascotas (2)');
    } finally {
        await app.close();
        await rm(root, { force: true, maxRetries: 10, recursive: true });
    }
});
