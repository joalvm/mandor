import { editor, Uri } from 'monaco-editor/editor/editor.api.js';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { DECLARATIONS, scriptWorkerInProcess } from '../../support/script-worker.js';

/** "Property 'x' does not exist on type 'T'. Did you mean 'y'?" */
const DID_YOU_MEAN = 2551;

/** "Cannot find name 'x'." */
const UNKNOWN_NAME = 2304;

/** "Property 'x' does not exist on type 'T'." */
const NO_SUCH_MEMBER = 2339;

let models = 0;

function scriptOf(text: string): { fileName: string; model: editor.ITextModel } {
    models += 1;

    const model = editor.createModel(
        text,
        'plaintext',
        Uri.parse(`inmemory://mandor/worker-${String(models)}`),
    );

    return { fileName: model.uri.toString(), model };
}

async function codesOf(
    worker: ReturnType<typeof scriptWorkerInProcess>['worker'],
    fileName: string,
): Promise<number[]> {
    const found = [
        ...(await worker.getSyntacticDiagnostics(fileName)),
        ...(await worker.getSemanticDiagnostics(fileName)),
    ];

    return found.map(({ code }) => code);
}

afterEach(() => {
    editor.getModels().forEach((model) => {
        model.dispose();
    });
});

describe('the worker of the service of scripts', () => {
    it('completes the names the declarations of its moment give', async () => {
        const { worker } = scriptWorkerInProcess();
        const { fileName } = scriptOf('mandor.');

        await worker.setDeclarations(fileName, DECLARATIONS);

        const info = await worker.getCompletionsAtPosition(fileName, 'mandor.'.length);

        expect(info?.entries.map(({ name }) => name)).toEqual(
            expect.arrayContaining(['response', 'send']),
        );
    });

    /** The declarations are written in TypeScript after a script of JavaScript: nobody wrote that. */
    it('marks what the script writes wrong, and nothing of the declarations after it', async () => {
        const { worker } = scriptWorkerInProcess();
        const { fileName } = scriptOf('const code = mandor.response.statu;\n');

        await worker.setDeclarations(fileName, DECLARATIONS);

        expect(await codesOf(worker, fileName)).toEqual([DID_YOU_MEAN]);
    });

    it('reads a script that names nothing wrong clean', async () => {
        const { worker } = scriptWorkerInProcess();
        const { fileName } = scriptOf('mandor.send(String(mandor.response.status));\n');

        await worker.setDeclarations(fileName, DECLARATIONS);

        expect(await codesOf(worker, fileName)).toEqual([]);
    });

    /** A new declaration is a new text: the service would answer out of the old one otherwise. */
    it('reads the script anew when its declarations change and its text does not', async () => {
        const { worker } = scriptWorkerInProcess();
        const { fileName } = scriptOf('mandor.send("a");\n');

        await worker.setDeclarations(fileName, DECLARATIONS);

        const before = worker.getScriptVersion(fileName);

        await worker.setDeclarations(fileName, DECLARATIONS.replace('send(', 'post('));

        expect(worker.getScriptVersion(fileName)).not.toBe(before);
        expect(await codesOf(worker, fileName)).toEqual([NO_SUCH_MEMBER]);
    });

    it('reads a script it was told to forget as the script alone', async () => {
        const { worker } = scriptWorkerInProcess();
        const { fileName, model } = scriptOf('mandor.send("a");\n');

        await worker.setDeclarations(fileName, DECLARATIONS);
        await worker.forgetDeclarations(fileName);

        expect(worker.getScriptVersion(fileName)).toBe(String(model.getVersionId()));
        expect(await codesOf(worker, fileName)).toEqual([UNKNOWN_NAME]);
    });

    /** Each script is a module: two scripts of two moments never see each other's `mandor`. */
    it('keeps what one script declares out of the next', async () => {
        const { worker } = scriptWorkerInProcess();
        const first = scriptOf('mandor.send("a");\n');
        const second = scriptOf('mandor.send("b");\n');

        await worker.setDeclarations(first.fileName, DECLARATIONS);

        expect(await codesOf(worker, first.fileName)).toEqual([]);
        expect(await codesOf(worker, second.fileName)).toEqual([UNKNOWN_NAME]);
    });

    /**
     * The window names a script after the key of its document, which may hold `//`, and the
     * service reads every name as a path, with no empty step in it.
     */
    it('reads a script whose key holds an empty step of a path', async () => {
        const { worker } = scriptWorkerInProcess();
        const model = editor.createModel(
            'const code = mandor.response.statu;\n',
            'plaintext',
            Uri.parse(`inmemory://mandor/${encodeURIComponent('mandor://local/a/../b:script')}`),
        );
        const fileName = model.uri.toString();

        await worker.setDeclarations(fileName, DECLARATIONS);

        expect(await codesOf(worker, fileName)).toEqual([DID_YOU_MEAN]);
    });

    /** A question travels while the window closes the script: the answer finds nothing to read. */
    it('answers nothing about a script the window let go of', async () => {
        const { worker } = scriptWorkerInProcess();
        const { fileName, model } = scriptOf('mandor.send("a");\n');

        await worker.setDeclarations(fileName, DECLARATIONS);
        model.dispose();

        expect(await codesOf(worker, fileName)).toEqual([]);
        await expect(worker.getCompletionsAtPosition(fileName, 7)).resolves.toBeUndefined();
        await expect(
            worker.getCompletionEntryDetails(fileName, 7, 'send'),
        ).resolves.toBeUndefined();
        await expect(worker.getSignatureHelpItems(fileName, 12, {})).resolves.toBeUndefined();
        await expect(worker.getQuickInfoAtPosition(fileName, 8)).resolves.toBeUndefined();
    });
});

describe('the thread of the service', () => {
    beforeAll(async () => {
        await import('../../../src/editor/monaco/script-worker-main.js');
    });

    afterAll(() => {
        self.onmessage = null;
    });

    /** Its first message brings Monaco's worker up, and the second carries what the worker starts with. */
    it('waits for the window before it starts the worker', () => {
        expect(typeof self.onmessage).toBe('function');
    });
});
