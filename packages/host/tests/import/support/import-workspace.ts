import { rm } from 'node:fs/promises';

import { initRepo, status } from '@mandor/git';
import type { FolderSetting, InteropScope, StorableKind } from '@mandor/interop-core';
import {
    CHANNELS,
    type ImportPlan,
    type ImportTarget,
    type ImportPlanBuilt,
    type ImportApplied,
    type Result,
} from '@mandor/ipc';
import { createWorkspace, writeRepoTree } from '@mandor/store-fs';

import { registerImportHandlers } from '../../../src/import/import.handlers.js';
import { readInThread } from '../../../src/import/read-import.js';
import { setActiveOrigin } from '../../../src/origin/active-origin.js';
import { spyIpc, type IpcSpy } from '../../../src/testing/handler-harness.js';
import { fixtureFormat, fixtureText } from '../../interop/fixture-format.js';
import { copiedRepo, type RepoCopy } from '../../support/copied-repo.js';

/** The pasarela fixture, shared by every import test that needs a document to bring in. */
export function readPasarela(): string {
    return fixtureText('pasarela-3');
}

/** A workspace of one's own, with the import handlers on a spy and the origin pointed at it. */
export type ImportWorkspace = {
    ipc: IpcSpy;
    dispose: () => void;
    root: string;
    plan: (text: string, scope?: InteropScope) => Promise<Result<ImportPlanBuilt>>;
    apply: (name: string, value: ImportPlan) => Promise<Result<ImportApplied>>;
    applyTo: (
        target: ImportTarget,
        name: string,
        value: ImportPlan,
    ) => Promise<Result<ImportApplied>>;
    statusOf: () => Promise<boolean>;
    firstImport: () => Promise<ImportPlan>;
};

/** What a workspace of the async app keeps, unless the test is about another app. */
const ASYNC_STORES: readonly StorableKind[] = ['message', 'connection'];

/** Every setting of a level, unless the test is about an app that keeps fewer. */
const ALL_SETTINGS: readonly FolderSetting[] = ['description', 'variables', 'auth', 'headers'];

/** The repo every import test starts from, laid out once per file: call it at the top. */
export function importRepo(): RepoCopy {
    return copiedRepo(async (root) => {
        await writeRepoTree(root, 'Demo');
        await createWorkspace(root, { id: 'pasarela', name: 'Pasarela', kind: 'async' });
        await initRepo(root);
    });
}

export async function startImportWorkspace(
    repo: RepoCopy,
    stores: readonly StorableKind[] = ASYNC_STORES,
    folderSettings: readonly FolderSetting[] = ALL_SETTINGS,
): Promise<ImportWorkspace> {
    const root = await repo();
    const ipc = spyIpc();
    const dispose = registerImportHandlers(ipc, {
        chooseDocument: () => Promise.resolve(null),
        formats: [fixtureFormat],
        readImport: readInThread,
        stores,
        folderSettings,
        kind: 'async',
        userDataDir: root,
        target: { isDestroyed: () => true, webContents: { send: () => undefined } },
    });

    setActiveOrigin({ id: 'local', name: 'Local', kind: 'local', root });

    const plan = async (text: string, scope: InteropScope = 'workspace') =>
        ipc.call(CHANNELS.importPlanBuild, {
            workspaceId: 'pasarela',
            files: [{ path: 'pasarela.json', text }],
            scope,
        }) as Promise<Result<ImportPlanBuilt>>;

    const applyTo = async (target: ImportTarget, name: string, value: ImportPlan) =>
        ipc.call(CHANNELS.importApply, {
            target,
            name,
            plan: value,
        }) as Promise<Result<ImportApplied>>;

    const apply = (name: string, value: ImportPlan) =>
        applyTo({ workspaceId: 'pasarela' }, name, value);

    const statusOf = async () => (await status(root)).clean;

    const firstImport = async () => {
        const built = await plan(readPasarela());

        if (!built.ok) {
            throw new Error('the fixture should build a plan');
        }

        const applied = await apply(built.value.name, built.value.plan);

        if (!applied.ok) {
            throw new Error('the first import should apply');
        }

        return built.value.plan;
    };

    return { ipc, dispose, root, plan, apply, applyTo, statusOf, firstImport };
}

export async function stopImportWorkspace(workspace: ImportWorkspace): Promise<void> {
    workspace.dispose();
    setActiveOrigin(null);

    await rm(workspace.root, { recursive: true, force: true });
}
