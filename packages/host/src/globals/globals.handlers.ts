import {
    CHANNELS,
    failure,
    globalsReadRequestSchema,
    globalsWriteRequestSchema,
    type Result,
    success,
} from '@mandor/ipc';
import type { Globals } from '@mandor/schema';
import {
    globalsFile,
    globalsTextWith,
    keepSecrets,
    readGlobals,
    readTextOrNull,
    writeGlobals,
} from '@mandor/store-fs';
import { globalsSecretKey } from '@mandor/vars';

import { failureOf } from '../ipc/failure-of.js';
import type { HandlerIpc } from '../ipc/handler-ipc.js';
import { activeRepo } from '../origin/active-repo.js';
import { guardedWrite } from '../repo/guarded-write.js';
import { rememberText } from '../repo/known-texts.js';
import { repoRelative } from '../repo/repo-relative.js';
import { keepSecretsAt } from '../secret/keep-environment-secrets.js';

export type GlobalsHandlerDeps = {
    /** Where the keychain of this machine keeps what the system store refuses. */
    userDataDir: string;
};

/**
 * The globals of the active origin. A read is remembered as what the window holds, so a later
 * write of it merges against that text and not over what arrived from another machine; a
 * secret value goes to the keychain before the file is written without it.
 */
export function registerGlobalsHandlers(ipc: HandlerIpc, deps: GlobalsHandlerDeps): () => void {
    ipc.handle(CHANNELS.globalsRead, (_event, raw) => read(raw));
    ipc.handle(CHANNELS.globalsWrite, (_event, raw) => write(deps, raw));

    return () => {
        ipc.removeHandler(CHANNELS.globalsRead);
        ipc.removeHandler(CHANNELS.globalsWrite);
    };
}

async function read(raw: unknown): Promise<Result<Globals>> {
    const request = globalsReadRequestSchema.safeParse(raw);
    const repo = activeRepo();

    if (!request.success) {
        return failure('bad-request', request.error.message);
    }

    if (!repo.ok) {
        return repo;
    }

    try {
        return success(await remembered(repo.value.root));
    } catch (error) {
        return failureOf(error);
    }
}

async function write(deps: GlobalsHandlerDeps, raw: unknown): Promise<Result<Globals>> {
    const request = globalsWriteRequestSchema.safeParse(raw);
    const repo = activeRepo();

    if (!request.success) {
        return failure('bad-request', request.error.message);
    }

    if (!repo.ok) {
        return repo;
    }

    try {
        const { root, id } = repo.value;
        const { globals } = request.data;
        const keep = keepSecretsAt({
            userDataDir: deps.userDataDir,
            root,
            keyOf: (name) => globalsSecretKey(id, name),
        });

        await guardedWrite({
            root,
            path: repoRelative(root, globalsFile(root)),
            change: { kind: 'update-globals' },
            beforeWrite: () => keepSecrets(keep, globals),
            oursFrom: (base) => globalsTextWith(base, globals),
            write: () => writeGlobals(root, globals),
        });

        return success(await readGlobals(root));
    } catch (error) {
        return failureOf(error);
    }
}

/** The globals on disk, with their text noted as what the window now believes. */
async function remembered(root: string): Promise<Globals> {
    const text = await readTextOrNull(globalsFile(root));

    rememberText(root, repoRelative(root, globalsFile(root)), text);

    return readGlobals(root);
}
