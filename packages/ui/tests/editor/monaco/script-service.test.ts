import { editor, Uri } from 'monaco-editor/editor/editor.api.js';
import { afterEach, describe, expect, it, vi } from 'vitest';

import '../../../src/editor/monaco/script-language.js';
import {
    startScriptService,
    type ScriptService,
} from '../../../src/editor/monaco/script-service.js';
import { DECLARATIONS, scriptWorkerInProcess } from '../../support/script-worker.js';

let models = 0;

let running: ScriptService | undefined;

/** The codes of the marks of a script: the service writes each as text. */
function marksOf(model: editor.ITextModel): unknown[] {
    return editor.getModelMarkers({ owner: 'script', resource: model.uri }).map(({ code }) => code);
}

/** The service over a thread of the test, and a script of the window it reads. */
function started(text: string) {
    const thread = scriptWorkerInProcess();
    const stop = vi.fn();

    models += 1;

    const model = editor.createModel(
        text,
        'script',
        Uri.parse(`inmemory://mandor/service-${String(models)}`),
    );
    const service = startScriptService(() => ({ stop, workerOf: thread.workerOf }));

    running = service;

    return { model, service, stop, worker: thread.worker };
}

afterEach(() => {
    running?.dispose();
    running = undefined;
    editor.getModels().forEach((model) => {
        model.dispose();
    });
});

describe('the service of scripts', () => {
    /** Until its moment says what `mandor` is, a script names something nobody declared. */
    it('reads a script against what it is declared with, as soon as it is', async () => {
        const { model, service } = started('mandor.respons;\n');

        await expect.poll(() => marksOf(model)).toEqual(['2304']);

        service.declare(model.uri, DECLARATIONS);

        await expect.poll(() => marksOf(model)).toEqual(['2551']);
    });

    it('lets go of the declarations of a script it is told to forget', async () => {
        const { model, service, worker } = started('mandor.response;\n');
        const fileName = model.uri.toString();

        service.declare(model.uri, DECLARATIONS);

        await expect.poll(() => worker.getScriptVersion(fileName)).not.toBe('1');

        service.forget(model.uri);

        await expect.poll(() => worker.getScriptVersion(fileName)).toBe('1');
    });

    it('ends its thread and takes its marks away when it ends', async () => {
        const { model, service, stop } = started('mandor.respons;\n');

        await expect.poll(() => marksOf(model)).toEqual(['2304']);

        service.dispose();
        running = undefined;

        expect(stop).toHaveBeenCalledOnce();
        expect(marksOf(model)).toEqual([]);
    });
});
