import { simpleGit } from 'simple-git';
import { loadRepo, readCollectionTree } from '@mandor/store-fs';
import { CHANNELS, type ImportPlanBuilt, type Result } from '@mandor/ipc';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    readPasarela,
    importRepo,
    startImportWorkspace,
    stopImportWorkspace,
    type ImportWorkspace,
} from './support/import-workspace.js';

const repo = importRepo();

let workspace: ImportWorkspace;

beforeEach(async () => {
    workspace = await startImportWorkspace(repo);
});

afterEach(async () => {
    await stopImportWorkspace(workspace);
});

/** The plan of a document for a workspace that does not exist yet: the request names none. */
async function planForNothing(): Promise<ImportPlanBuilt> {
    const built = (await workspace.ipc.call(CHANNELS.importPlanBuild, {
        files: [{ path: 'pasarela.json', text: readPasarela() }],
        scope: 'workspace',
    })) as Result<ImportPlanBuilt>;

    if (!built.ok) {
        throw new Error('the fixture should build a plan');
    }

    return built.value;
}

describe('importing a document into a workspace that does not exist yet', () => {
    it('plans every resource as an addition, for there is nothing to compare with', async () => {
        const built = await planForNothing();

        expect(new Set(built.plan.entries.map((entry) => entry.class))).toEqual(new Set(['add']));
    });

    it('makes the workspace after the document and writes the plan into it', async () => {
        const built = await planForNothing();
        const applied = await workspace.applyTo(
            { newWorkspace: built.name },
            built.name,
            built.plan,
        );

        if (!applied.ok) {
            throw new Error('the import should apply');
        }

        const made = (await loadRepo(workspace.root)).workspaces.find(
            (each) => each.id === applied.value.workspaceId,
        );
        const tree = await readCollectionTree(workspace.root, applied.value.workspaceId);

        expect(applied.value.applied).toBeGreaterThan(0);
        expect(made).toMatchObject({ name: 'Pasarela (2)', kind: 'async' });
        expect(tree.nodes).toHaveLength(1);
    });

    it('lands the workspace and what it holds as one commit, and leaves the tree clean', async () => {
        const before = await simpleGit(workspace.root).log();
        const built = await planForNothing();

        await workspace.applyTo({ newWorkspace: built.name }, built.name, built.plan);

        const after = await simpleGit(workspace.root).log();

        expect(after.total).toBe(before.total + 1);
        expect(await workspace.statusOf()).toBe(true);
    });

    it('answers with the workspace it was asked to write into when it already existed', async () => {
        const built = await planForNothing();
        const applied = await workspace.apply(built.name, built.plan);

        expect(applied.ok && applied.value.workspaceId).toBe('pasarela');
    });
});
