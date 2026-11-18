import { readFileSync } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test, type ElectronApplication, type Page } from '@playwright/test';

import {
    diskTree,
    entityNamed,
    holderNamed,
    workspaceNamed,
} from '../../../../tools/workspace/disk-by-name.mjs';
import { expectFirstRun } from './support/first-run.js';
import { launch, makeSandbox } from './support/launch-app.js';
import { exportWorkspace, importWorkspace, openWorkspacesPanel } from './support/workspace-doc.js';

const FIXTURE = readFileSync(
    fileURLToPath(
        new URL(
            '../../../../packages/interop-formats/tests/mandor/fixtures/async-workspace.mandor.yaml',
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
                holderNamed(tree, `${dir}/collections`, ['Pedidos']),
                entityNamed(tree, `${dir}/environments`, 'Dev'),
                entityNamed(tree, `${dir}/connections`, 'Pedidos'),
            ]);

            return found.every((path) => path !== null);
        })
        .toBe(true);
}

/** The file the export wrote says everything the workspace holds, the connection among it. */
function expectWorkspaceCarries(text: string): void {
    expect(text).toContain('app: async');
    expect(text).toContain('name: Pasarela de Pedidos');
    expect(text).toContain('name: Pedidos');
    expect(text).toContain('name: registrarPedido');
    expect(text).toContain('name: Dev');
    expect(text).toContain('transport: websocket');
    expect(text).toContain('url: wss://api.test/ws');
}

/** The panel of the workspaces, with the file dropped in: the new workspace is the open one. */
async function bringWorkspaceIn(page: Page): Promise<void> {
    await openWorkspacesPanel(page, 'Personal');
    await importWorkspace(page, FIXTURE);

    await expect(
        page.getByRole('button', { exact: true, name: 'Pasarela de Pedidos' }),
    ).toBeVisible();
}

/**
 * The trip of a whole workspace in Realtime: an Mandor file comes in through the list of
 * workspaces and becomes a workspace of its own, connections included, goes out again from the
 * page of the workspaces, and the file it wrote comes in a second time beside the first.
 */
test('a workspace file comes in as a new workspace, goes out whole and comes in again beside it', async () => {
    const sandbox = await makeSandbox();
    const exportsDir = join(sandbox.root, 'exports');

    await mkdir(exportsDir, { recursive: true });

    let running: ElectronApplication | undefined;

    try {
        const { app, page } = await launch(sandbox.userDataDir, sandbox.defaultRepoRoot, {
            MANDOR_SAVE_DIR: exportsDir,
        });

        running = app;

        await expectFirstRun(page);
        await bringWorkspaceIn(page);
        await expectOnDisk(sandbox.repoRoot, 'Pasarela de Pedidos');

        const exported = await exportWorkspace(
            page,
            { file: 'pasarela-de-pedidos.mandor.yaml', name: 'Pasarela de Pedidos' },
            exportsDir,
        );

        expectWorkspaceCarries(exported);

        // The file the export wrote asks for a new workspace, never the open one: the name it
        // brings is taken, so the second lands beside the first.
        await openWorkspacesPanel(page, 'Pasarela de Pedidos');
        await importWorkspace(page, exported);

        await expect(
            page.getByRole('button', { exact: true, name: 'Pasarela de Pedidos (2)' }),
        ).toBeVisible();
        await expectOnDisk(sandbox.repoRoot, 'Pasarela de Pedidos');
        await expectOnDisk(sandbox.repoRoot, 'Pasarela de Pedidos (2)');
    } finally {
        if (running !== undefined) {
            await running.close();
        }

        await rm(sandbox.root, { force: true, maxRetries: 10, recursive: true });
    }
});
