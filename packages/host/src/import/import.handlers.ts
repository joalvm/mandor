import type { FolderSetting, InteropFormat, StorableKind } from '@mandor/interop-core';
import {
    CHANNELS,
    failure,
    IMPORT_PROGRESS_EVERY,
    importApplyRequestSchema,
    importPickRequestSchema,
    success,
    type ImportApplyRequest,
    type ImportApplied,
    type ImportPicked,
    type Result,
} from '@mandor/ipc';
import type { WorkspaceKind } from '@mandor/schema';

import { failureOf } from '../ipc/failure-of.js';
import type { HandlerIpc } from '../ipc/handler-ipc.js';
import { pushToWindow, type PushTarget } from '../ipc/push-to-window.js';
import { activeRepo, type ActiveRepo } from '../origin/active-repo.js';
import { reshapeRepo } from '../repo/reshape-repo.js';
import type { ChooseDocument } from './choose-document.js';
import { applyPlan } from './apply-plan.js';
import type { HeldSecrets } from './held-secrets.js';
import { targetPlaces, workspaceOfTarget } from './import-target.js';
import { importedSecretsKeeper } from './keep-imported-secrets.js';
import { planBuilder } from './plan-builder.js';
import type { ReadImport } from './read-import.js';
import { readPicked } from './read-picked.js';

/**
 * The channels of importing: one builds the whole difference without touching disk, another
 * writes the plan the user accepted as one commit. Both do their work in main — the parser and
 * its dependency tree live here, the calls cross the bridge as data, and the window keeps
 * answering while a big document is being read, with its own channel to stop that read.
 */
export type ImportHandlerDeps = {
    chooseDocument: ChooseDocument;
    /** The formats the app reads. The request names one by its id. */
    formats: readonly InteropFormat[];
    /** How the files are read once a format recognized them: in the app, in a worker of its own. */
    readImport: ReadImport;
    /** The kinds of leaf this app keeps: a document may hold more, and the rest is left out. */
    stores: readonly StorableKind[];
    /** What this app keeps of a collection or a folder: the rest stays out, with a row. */
    folderSettings: readonly FolderSetting[];
    /** The kind of workspace this app hosts: the one an import into a new workspace makes. */
    kind: WorkspaceKind;
    /** Where the store of the system keeps the values of the secrets a document brings. */
    userDataDir: string;
    /** The window that hears how the read of what was picked goes. */
    target: PushTarget;
};

/** The read in course, the only one the person can stop: each starts with a signal of its own. */
type Reads = { start: () => AbortSignal; stop: () => void };

function oneReadAtATime(): Reads {
    let current = new AbortController();

    return {
        start: () => {
            current = new AbortController();

            return current.signal;
        },
        stop: () => {
            current.abort();
        },
    };
}

type ApplyDeps = Pick<ImportHandlerDeps, 'kind' | 'userDataDir'> & { held: HeldSecrets };

export function registerImportHandlers(ipc: HandlerIpc, deps: ImportHandlerDeps): () => void {
    const held: HeldSecrets = new Map();
    const reads = oneReadAtATime();
    const buildPlan = planBuilder(
        deps.formats,
        deps,
        (format, files, scope) => deps.readImport(format, files, scope, reads.start()),
        held,
    );

    ipc.handle(CHANNELS.importPlanBuild, (_event, raw) => buildPlan(raw));
    ipc.handle(CHANNELS.importApply, (_event, raw) => applyAccepted(raw, { ...deps, held }));
    ipc.handle(CHANNELS.importPick, (_event, raw) => pickDocument(raw, deps, reads));
    ipc.handle(CHANNELS.importCancel, () => {
        reads.stop();

        return Promise.resolve(success({}));
    });

    return () => {
        ipc.removeHandler(CHANNELS.importPlanBuild);
        ipc.removeHandler(CHANNELS.importApply);
        ipc.removeHandler(CHANNELS.importPick);
        ipc.removeHandler(CHANNELS.importCancel);
    };
}

async function pickDocument(
    raw: unknown,
    deps: ImportHandlerDeps,
    reads: Reads,
): Promise<Result<ImportPicked>> {
    const request = importPickRequestSchema.safeParse(raw);

    if (!request.success) {
        return failure('bad-request', request.error.message);
    }

    const paths = await deps.chooseDocument(request.data.input);

    if (paths === null) {
        return success({ files: null });
    }

    return readThePick(paths, reads.start(), deps.target);
}

/** Stopping the read is no failure: it answers as the person closing the dialog does. */
async function readThePick(
    paths: readonly string[],
    signal: AbortSignal,
    target: PushTarget,
): Promise<Result<ImportPicked>> {
    pushToWindow(target, CHANNELS.importProgress, { files: 0 });

    try {
        const files = await readPicked(paths, {
            signal,
            onRead: (read) => {
                if (read % IMPORT_PROGRESS_EVERY === 0) {
                    pushToWindow(target, CHANNELS.importProgress, { files: read });
                }
            },
        });

        return success({ files });
    } catch (error) {
        return signal.aborted ? success({ files: null }) : failureOf(error);
    }
}

async function applyAccepted(raw: unknown, deps: ApplyDeps): Promise<Result<ImportApplied>> {
    const request = importApplyRequestSchema.safeParse(raw);

    if (!request.success) {
        return failure('bad-request', request.error.message);
    }

    const repo = activeRepo();

    if (!repo.ok) {
        return repo;
    }

    try {
        return await applyAll(repo.value, deps, request.data);
    } catch (error) {
        return failureOf(error);
    }
}

/**
 * Writes the plan as one commit: one import is one change of the repo, however many resources it
 * carries — and the workspace it makes, when it asks for a new one. The answer counts what
 * landed; the collections on screen are the rest of it.
 */
async function applyAll(
    { root, id: repo }: ActiveRepo,
    { kind, userDataDir, held }: ApplyDeps,
    request: ImportApplyRequest,
): Promise<Result<ImportApplied>> {
    const { target, name, plan } = request;

    const done = await reshapeRepo<ImportApplied>(
        {
            root,
            paths: (landed) => targetPlaces(root, target, landed.workspaceId),
            change: { kind: 'import-document', name },
        },
        async () => {
            const workspaceId = await workspaceOfTarget(root, kind, target);
            const keep = importedSecretsKeeper(held, { userDataDir, root, repo, workspaceId });
            const applied = await applyPlan(root, workspaceId, plan, keep);

            return { applied: applied.filter((entry) => entry.ok).length, workspaceId };
        },
    );

    held.clear();

    return success(done);
}
