import { writeFile } from 'node:fs/promises';

import type { ChooseSavePath, HandlerIpc } from '@mandor/host';
import {
    CHANNELS,
    exportJsonlRequestSchema,
    failure,
    success,
    type ExportedFile,
    type Result,
} from '@mandor/ipc';

import { redactedJsonl } from './redacted-jsonl.js';

export type JsonlExportHandlerDeps = {
    chooseSavePath: ChooseSavePath;
};

/**
 * The channel that writes the activity of a connection to a file, one record per line. It is
 * Async's alone: the activity of a socket is what it exports, and Sync has no socket. Like every
 * export it asks the user where, writes the text redacted, and answers with the path only.
 */
export function registerJsonlExportHandlers(
    ipc: HandlerIpc,
    deps: JsonlExportHandlerDeps,
): () => void {
    ipc.handle(CHANNELS.exportJsonl, (_event, raw) => exportJsonl(deps, raw));

    return () => {
        ipc.removeHandler(CHANNELS.exportJsonl);
    };
}

async function exportJsonl(
    deps: JsonlExportHandlerDeps,
    raw: unknown,
): Promise<Result<ExportedFile>> {
    const request = exportJsonlRequestSchema.safeParse(raw);

    if (!request.success) {
        return failure('bad-request', request.error.message);
    }

    const path = await deps.chooseSavePath(request.data.suggestedName);

    if (path === null) {
        return success({ path: null });
    }

    try {
        await writeFile(path, redactedJsonl(request.data.records), 'utf8');

        return success({ path });
    } catch (error) {
        return failure('fs-write', String(error));
    }
}
