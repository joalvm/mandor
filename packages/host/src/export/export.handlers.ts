import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import {
    selectWorkspaceData,
    workspaceDataInScope,
    workspaceOutline,
    type InteropFormat,
} from '@mandor/interop-core';
import {
    CHANNELS,
    exportOutlineRequestSchema,
    exportWriteRequestSchema,
    failure,
    success,
    type ExportedFile,
    type Result,
} from '@mandor/ipc';
import { FormatError } from '@mandor/schema';

import { formattedHandler } from '../ipc/formatted-handler.js';
import type { HandlerIpc } from '../ipc/handler-ipc.js';
import { redactedDocument } from '../secret/redact-message.js';
import type { ChooseSaveFolder } from './choose-save-folder.js';
import type { ChooseSavePath } from './choose-save-path.js';
import { workspaceDataOf } from './workspace-data-of.js';

export type ExportHandlerDeps = {
    /** Where one file goes: the save dialog of the system. */
    chooseSavePath: ChooseSavePath;
    /** Where several go: a folder of the user's choosing. */
    chooseSaveFolder: ChooseSaveFolder;
    /** The formats the app writes. The request names one by its id. */
    formats: readonly InteropFormat[];
};

/** One file of what a write has built, before the user says where it goes. */
type BuiltFile = { path: string; text: string };

/** What a write has built: at least one file, each already redacted. */
type BuiltFiles = [BuiltFile, ...BuiltFile[]];

/**
 * The channels that write outside the app. The outline is what the dialog shows to choose
 * from; the write takes the leaves left marked, builds the documents in main — the parser lives
 * there — asks the user where they go and writes them redacted. The answer carries the path, or
 * the folder when there were several, and never the text.
 */
export function registerExportHandlers(ipc: HandlerIpc, deps: ExportHandlerDeps): () => void {
    const outline = outlineHandler(deps.formats);
    const write = writeHandler(deps);

    ipc.handle(CHANNELS.exportOutline, (_event, raw) => outline(raw));
    ipc.handle(CHANNELS.exportWrite, (_event, raw) => write(raw));

    return () => {
        ipc.removeHandler(CHANNELS.exportOutline);
        ipc.removeHandler(CHANNELS.exportWrite);
    };
}

/**
 * The workspace, or the collection the scope names, as the tree of what the format would write.
 * Nothing is built or written: the data is read straight off the disk, and the format only says
 * which kinds it has no place for.
 */
function outlineHandler(formats: readonly InteropFormat[]) {
    return formattedHandler(
        exportOutlineRequestSchema,
        formats,
        async (root, format, { collection, scope, workspaceId }) => {
            const data = workspaceDataInScope(
                await workspaceDataOf(root, workspaceId, collection),
                scope,
            );

            return {
                name: data.name,
                nodes: workspaceOutline(data, format.unwritten, format.unkept),
            };
        },
        (error) => failure('fs-read', String(error)),
    );
}

/**
 * The workspace cut to the leaves that were chosen, as the files of the format, each redacted
 * while it is still data. The codec loads when an export asks for it, never at startup, and
 * never inside the renderer.
 */
function documentBuilder(formats: readonly InteropFormat[]) {
    return formattedHandler(
        exportWriteRequestSchema,
        formats,
        async (root, format, { chosen, collection, scope, workspaceId }): Promise<BuiltFiles> => {
            if (format.writes.length === 0) {
                throw new FormatError([`${format.id} writes no file`]);
            }

            const codec = await format.load();
            const data = await workspaceDataOf(root, workspaceId, collection);
            const cut = selectWorkspaceData(data, new Set(chosen), scope);
            const [first, ...rest] = codec.documentsOf(cut).map(({ path, document }) => ({
                path,
                text: codec.textOf(redactedDocument(document)),
            }));

            if (first === undefined) {
                throw new FormatError([`${format.id} wrote nothing`]);
            }

            return [first, ...rest];
        },
    );
}

function writeHandler(deps: ExportHandlerDeps) {
    const build = documentBuilder(deps.formats);

    return async (raw: unknown): Promise<Result<ExportedFile>> => {
        const built = await build(raw);

        if (!built.ok) {
            return built;
        }

        const destination = await destinationOf(deps, built.value);

        if (destination === null) {
            return success({ path: null });
        }

        try {
            await writeAll(destination.files);

            return success({ path: destination.target });
        } catch (error) {
            return failure('fs-write', String(error));
        }
    };
}

/** Where the files go: the path or folder to answer, and each file with the path it lands on. */
type Destination = { target: string; files: BuiltFile[] };

/**
 * One file asks for a path, under the name it brings; several ask for a folder and keep the
 * paths they bring inside it. Null is the user closing the dialog.
 */
async function destinationOf(
    deps: ExportHandlerDeps,
    [first, ...rest]: BuiltFiles,
): Promise<Destination | null> {
    if (rest.length === 0) {
        const path = await deps.chooseSavePath(first.path);

        return path === null ? null : { target: path, files: [{ ...first, path }] };
    }

    const folder = await deps.chooseSaveFolder();

    return folder === null
        ? null
        : {
              target: folder,
              files: [first, ...rest].map((file) => ({ ...file, path: join(folder, file.path) })),
          };
}

async function writeAll(files: readonly BuiltFile[]): Promise<void> {
    for (const { path, text } of files) {
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, text, 'utf8');
    }
}
