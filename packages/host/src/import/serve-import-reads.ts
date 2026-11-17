import { parentPort } from 'node:worker_threads';

import { FormatInputError, type InteropFormat } from '@mandor/interop-core';

import type { ImportReadReply, ImportReadRequest } from './import-worker-message.js';
import { readInThread } from './read-import.js';

/** The answer to one read: the format the request names reads the files, here. */
export async function answerRead(
    formats: readonly InteropFormat[],
    request: ImportReadRequest,
): Promise<ImportReadReply> {
    const format = formats.find((each) => each.id === request.formatId);

    if (format === undefined) {
        return { kind: 'failed', message: `the import worker lists no format ${request.formatId}` };
    }

    try {
        return { kind: 'read', read: await readInThread(format, request.files, request.scope) };
    } catch (error) {
        if (error instanceof FormatInputError) {
            return { kind: 'refused', problems: error.problems };
        }

        return { kind: 'failed', message: error instanceof Error ? error.message : String(error) };
    }
}

/**
 * The body of the worker of an import: it answers the one read main sends and main ends it.
 * Imported from the main thread it does nothing, since there is no parent to answer.
 */
export function serveImportReads(formats: readonly InteropFormat[]): void {
    const port = parentPort;

    if (port === null) {
        return;
    }

    port.once('message', (request: ImportReadRequest) => {
        void answerRead(formats, request).then((reply) => {
            port.postMessage(reply);
        });
    });
}
