import { restoreFile, type RepoChange } from '@mandor/git';
import {
    CHANNELS,
    docCreateRequestSchema,
    docDeleteRequestSchema,
    docListRequestSchema,
    docReadRequestSchema,
    docRenameRequestSchema,
    docRevertRequestSchema,
    docWriteRequestSchema,
    failure,
    type Empty,
    type Err,
} from '@mandor/ipc';
import { docFileName, IdError, newId } from '@mandor/schema';
import {
    createDoc,
    deleteDoc,
    docParts,
    docRepoPath,
    docTextWith,
    inTurn,
    listDocs,
    readDoc,
    retitleDoc,
    writeDoc,
} from '@mandor/store-fs';

import { failureOf } from '../ipc/failure-of.js';
import type { HandlerIpc } from '../ipc/handler-ipc.js';
import { rootedHandler } from '../ipc/rooted-handler.js';
import { cancelCommit } from '../repo/commit-scheduler.js';
import { guardedWrite } from '../repo/guarded-write.js';
import { rememberText } from '../repo/known-texts.js';
import { nameOnDisk } from '../repo/name-on-disk.js';
import { reshapeRepo } from '../repo/reshape-repo.js';
import { trackWrite } from '../runtime/write-drain.js';

/** The channels of the docs of a workspace, and the order they are taken down in. */
const CHANNEL_NAMES = [
    CHANNELS.docCreate,
    CHANNELS.docDelete,
    CHANNELS.docList,
    CHANNELS.docRead,
    CHANNELS.docRename,
    CHANNELS.docWrite,
    CHANNELS.docRevert,
] as const;

/** Nothing comes back from a write: the answer is that it happened. */
const NOTHING: Empty = {};

/** A doc that is gone from disk is a read that failed, not an unknown state of the app. */
function readFailure(error: unknown): Err {
    if (error instanceof IdError) {
        return failureOf(error);
    }

    return failure('fs-read', String(error));
}

/**
 * Undo at the level of the file: the editor undoes keystrokes, this undoes the whole session.
 * It takes the turn of the repo like any write: an edit still waiting for it is one the user is
 * undoing, and landing after the revert would bring it back.
 */
function revertDoc(root: string, request: { name: string; workspaceId: string }) {
    const path = docRepoPath(root, request.workspaceId, request.name);

    return trackWrite(
        inTurn(root, async () => {
            // What waits for the calm is the edit the user is undoing: committing it first would
            // make the revert measure against the very text it throws away.
            cancelCommit(root, path);
            await restoreFile(root, path);

            return readAndRemember(root, request.workspaceId, request.name);
        }),
    );
}

/**
 * What the window is handed is the body, and what it will believe is the whole file, so the file
 * is what is noted before the body leaves: the title never reaches the editor.
 */
async function readAndRemember(root: string, workspaceId: string, name: string): Promise<string> {
    const text = await readDoc(root, workspaceId, name);

    rememberText(root, docRepoPath(root, workspaceId, name), text);

    return docParts(text).body;
}

const createDocHandler = rootedHandler(docCreateRequestSchema, (root, { workspaceId, title }) => {
    const name = docFileName(newId());

    return reshapeRepo(
        {
            root,
            paths: [docRepoPath(root, workspaceId, name)],
            change: { kind: 'create-doc', name: title },
        },
        async () => {
            await createDoc(root, workspaceId, { name, title });

            return name;
        },
    );
});

const deleteDocHandler = rootedHandler(
    docDeleteRequestSchema,
    async (root, { workspaceId, name }) => {
        const path = docRepoPath(root, workspaceId, name);
        const title = await nameOnDisk(root, path);

        return reshapeRepo(
            { root, paths: [path], change: { kind: 'delete-doc', name: title } },
            async () => {
                await deleteDoc(root, workspaceId, name);

                return NOTHING;
            },
        );
    },
);

const listDocsHandler = rootedHandler(docListRequestSchema, (root, { workspaceId }) =>
    listDocs(root, workspaceId),
);

const readDocHandler = rootedHandler(
    docReadRequestSchema,
    (root, { workspaceId, name }) => readAndRemember(root, workspaceId, name),
    readFailure,
);

const retitleDocHandler = rootedHandler(
    docRenameRequestSchema,
    (root, { workspaceId, name, title }) => {
        const path = docRepoPath(root, workspaceId, name);

        return reshapeRepo(
            { root, paths: [path], change: { kind: 'rename-doc', name: title } },
            async () => {
                rememberText(root, path, await retitleDoc(root, workspaceId, name, title));

                return NOTHING;
            },
        );
    },
);

const writeDocHandler = rootedHandler(
    docWriteRequestSchema,
    async (root, { workspaceId, name, text }) => {
        const path = docRepoPath(root, workspaceId, name);

        await guardedWrite({
            root,
            path,
            // Started here, awaited after the turn: a revert sent after this edit must not slip
            // in front of it while the title is being read.
            change: nameOnDisk(root, path).then((title): RepoChange => ({
                kind: 'update-doc',
                name: title,
            })),
            oursFrom: (base) => docTextWith(base ?? '', { body: text }),
            write: () => writeDoc(root, workspaceId, name, text),
        });

        return NOTHING;
    },
);

const revertDocHandler = rootedHandler(docRevertRequestSchema, revertDoc, readFailure);

/**
 * The seven channels a renderer uses over the docs of a workspace. Markdown belongs to whoever
 * wrote the repo, so it crosses as text and main neither parses it nor rewrites it.
 *
 * Creating, retitling and deleting commit in the act; writing commits once the typing calms. A revert
 * measures against the last commit, so the edit waiting for its calm is dropped before it.
 */
export function registerDocHandlers(ipc: HandlerIpc): () => void {
    ipc.handle(CHANNELS.docCreate, (_event, raw) => createDocHandler(raw));
    ipc.handle(CHANNELS.docDelete, (_event, raw) => deleteDocHandler(raw));
    ipc.handle(CHANNELS.docList, (_event, raw) => listDocsHandler(raw));
    ipc.handle(CHANNELS.docRead, (_event, raw) => readDocHandler(raw));
    ipc.handle(CHANNELS.docRename, (_event, raw) => retitleDocHandler(raw));
    ipc.handle(CHANNELS.docWrite, (_event, raw) => writeDocHandler(raw));
    ipc.handle(CHANNELS.docRevert, (_event, raw) => revertDocHandler(raw));

    return () => {
        for (const channel of CHANNEL_NAMES) {
            ipc.removeHandler(channel);
        }
    };
}
