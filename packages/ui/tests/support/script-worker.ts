import { editor } from 'monaco-editor/editor/editor.api.js';

import type { WorkerOf } from '../../src/editor/monaco/script-providers.js';
import { COMPILER_OPTIONS } from '../../src/editor/monaco/script-service.js';
import { ScriptTsWorker } from '../../src/editor/monaco/script-ts-worker.js';

/** What a script of the tests is read against: two objects, a call and the text of each. */
export const DECLARATIONS = `interface Mandor {
    /** What came back. */
    readonly response: MandorResponse;
    /**
     * Sends a value.
     * @param name The name it goes under.
     */
    send(name: string): void;
}

interface MandorResponse {
    /** The status of the answer. */
    readonly status: number;
}

declare const mandor: Mandor;
`;

/**
 * The service of scripts in the thread of the test: the worker the window starts, reading the
 * models of the window as they are at each question, as the thread reads them once synced.
 */
export function scriptWorkerInProcess(): { worker: ScriptTsWorker; workerOf: WorkerOf } {
    const worker = new ScriptTsWorker(
        {
            getMirrorModels: () =>
                editor.getModels().map((model) => ({
                    getValue: () => model.getValue(),
                    uri: model.uri,
                    version: model.getVersionId(),
                })),
        },
        { compilerOptions: COMPILER_OPTIONS, extraLibs: {} },
    );

    return { worker, workerOf: () => Promise.resolve(worker) };
}
