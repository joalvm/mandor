import { editor, MarkerSeverity, Uri } from 'monaco-editor/editor/editor.api.js';
import { afterEach, describe, expect, it } from 'vitest';

import '../../../src/editor/monaco/script-language.js';
import {
    checkScripts,
    explainModel,
    type ScriptChecks,
} from '../../../src/editor/monaco/script-diagnostics.js';
import { DECLARATIONS, scriptWorkerInProcess } from '../../support/script-worker.js';

let models = 0;

let running: ScriptChecks | undefined;

function marksOf(model: editor.ITextModel): editor.IMarker[] {
    return editor.getModelMarkers({ owner: 'script', resource: model.uri });
}

/** A script read against the declarations of the tests, and the checks of the window over it. */
async function checked(text: string, language = 'script'): Promise<editor.ITextModel> {
    const { worker, workerOf } = scriptWorkerInProcess();

    models += 1;

    const model = editor.createModel(
        text,
        language,
        Uri.parse(`inmemory://mandor/checks-${String(models)}`),
    );

    await worker.setDeclarations(model.uri.toString(), DECLARATIONS);
    running = checkScripts(workerOf, 0);

    return model;
}

afterEach(() => {
    running?.dispose();
    running = undefined;
    editor.getModels().forEach((model) => {
        model.dispose();
    });
});

describe('the marks of a script', () => {
    it('marks a member its moment does not show, where it was written', async () => {
        const model = await checked('const code = mandor.response.statu;\n');

        await expect.poll(() => marksOf(model).length).toBe(1);
        expect(marksOf(model)[0]).toMatchObject({
            code: '2551',
            endColumn: 35,
            severity: MarkerSeverity.Error,
            startColumn: 30,
            startLineNumber: 1,
        });
        expect(marksOf(model)[0]?.message).toContain('statu');
    });

    /** A script is the body of a function: the engine lets it end with a return and wait at its top. */
    it('leaves alone the return and the await the engine runs a script with', async () => {
        const model = await checked(
            'await Promise.resolve();\nif (mandor.response.status > 0) {\n    return;\n}\nmandor.respons;\n',
        );

        await expect.poll(() => marksOf(model).map(({ code }) => code)).toEqual(['2551']);
    });

    it('checks the script again once its writer pauses', async () => {
        const model = await checked('mandor.respons;\n');

        await expect.poll(() => marksOf(model).length).toBe(1);

        model.setValue('mandor.response;\n');

        await expect.poll(() => marksOf(model).length).toBe(0);
    });

    it('takes its marks away when the checks end', async () => {
        const model = await checked('mandor.respons;\n');

        await expect.poll(() => marksOf(model).length).toBe(1);

        running?.dispose();

        expect(marksOf(model)).toEqual([]);
    });

    it('checks a text that becomes a script, and lets go of one that stops being one', async () => {
        const model = await checked('mandor.respons;\n', 'plaintext');

        editor.setModelLanguage(model, 'script');

        await expect.poll(() => marksOf(model).length).toBe(1);

        editor.setModelLanguage(model, 'plaintext');

        expect(marksOf(model)).toEqual([]);
    });

    /** The caller knows what the name is: the mark of the service would say less, a second time. */
    it('leaves to the caller a name it does not know that the caller marks', async () => {
        const model = await checked('pm.environment.get("a");\nnobody;\nmandor.respons;\n');
        const explained = explainModel(model, () => [
            { from: 0, message: 'Postman', severity: 'warning', to: 18 },
        ]);

        running?.recheck(model);

        await expect.poll(() => marksOf(model).map(({ code }) => code)).toEqual(['2304', '2551']);
        expect(marksOf(model)[0]?.startLineNumber).toBe(2);

        explained.dispose();
        running?.recheck(model);

        await expect.poll(() => marksOf(model).length).toBe(3);
    });

    it('keeps its mark once the caller that explained it gave way to another', async () => {
        const model = await checked('pm;\n');
        const first = explainModel(model, () => [
            { from: 0, message: 'a', severity: 'warning', to: 2 },
        ]);

        explainModel(model, () => []);
        first.dispose();
        running?.recheck(model);

        await expect.poll(() => marksOf(model).map(({ code }) => code)).toEqual(['2304']);
    });
});
