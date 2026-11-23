import {
    CancellationTokenSource,
    editor,
    languages,
    Position,
    Uri,
} from 'monaco-editor/editor/editor.api.js';
import { afterEach, describe, expect, it } from 'vitest';

import '../../../src/editor/monaco/script-language.js';
import {
    completionsOf,
    hoverOf,
    signaturesOf,
    type WorkerOf,
} from '../../../src/editor/monaco/script-providers.js';
import { DECLARATIONS, scriptWorkerInProcess } from '../../support/script-worker.js';

const { token } = new CancellationTokenSource();

let models = 0;

/** A script of the window, read against the declarations of the tests. */
async function declared(text: string): Promise<{ model: editor.ITextModel; workerOf: WorkerOf }> {
    const { worker, workerOf } = scriptWorkerInProcess();

    models += 1;

    const model = editor.createModel(
        text,
        'script',
        Uri.parse(`inmemory://mandor/providers-${String(models)}`),
    );

    await worker.setDeclarations(model.uri.toString(), DECLARATIONS);

    return { model, workerOf };
}

function endOf(model: editor.ITextModel): Position {
    return model.getPositionAt(model.getValueLength());
}

async function suggestionsAt(text: string): Promise<languages.CompletionItem[]> {
    const { model, workerOf } = await declared(text);
    const found = await completionsOf(workerOf).provideCompletionItems(
        model,
        endOf(model),
        { triggerKind: languages.CompletionTriggerKind.Invoke },
        token,
    );

    return found?.suggestions ?? [];
}

afterEach(() => {
    editor.getModels().forEach((model) => {
        model.dispose();
    });
});

describe('what the service of scripts suggests', () => {
    it('suggests the members of an object after its dot, each by its kind', async () => {
        const suggestions = await suggestionsAt('mandor.');

        expect(suggestions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    kind: languages.CompletionItemKind.Property,
                    label: 'response',
                }),
                expect.objectContaining({
                    kind: languages.CompletionItemKind.Method,
                    label: 'send',
                }),
            ]),
        );
    });

    /** What was typed of the name is what the suggestion replaces. */
    it('replaces the part of the name already written', async () => {
        const suggestions = await suggestionsAt('mandor.res');
        const response = suggestions.find(({ label }) => label === 'response');

        expect(response?.range).toMatchObject({ endColumn: 11, startColumn: 8 });
    });

    it('brings the type and the text of a suggestion once it is chosen', async () => {
        const { model, workerOf } = await declared('mandor.');
        const provider = completionsOf(workerOf);
        const found = await provider.provideCompletionItems(
            model,
            endOf(model),
            { triggerKind: languages.CompletionTriggerKind.Invoke },
            token,
        );
        const send = found?.suggestions.find(({ label }) => label === 'send');
        const resolved =
            send === undefined ? undefined : await provider.resolveCompletionItem?.(send, token);

        expect(resolved?.detail).toBe('(method) Mandor.send(name: string): void');
        expect(resolved?.documentation).toEqual({
            value: 'Sends a value.\n\n*@param* `name` The name it goes under.',
        });
    });

    it('offers to suggest after a dot, the moment it is typed', () => {
        expect(completionsOf(() => Promise.reject(new Error('unasked'))).triggerCharacters).toEqual(
            ['.'],
        );
    });
});

describe('the signature of a call', () => {
    it('shows the call the caret stands in, with its parameter and their text', async () => {
        const { model, workerOf } = await declared('mandor.send(');
        const help = await signaturesOf(workerOf).provideSignatureHelp(model, endOf(model), token, {
            isRetrigger: false,
            triggerCharacter: '(',
            triggerKind: languages.SignatureHelpTriggerKind.TriggerCharacter,
        });

        expect(help?.value).toMatchObject({
            activeParameter: 0,
            activeSignature: 0,
            signatures: [
                {
                    label: 'send(name: string): void',
                    parameters: [
                        { documentation: 'The name it goes under.', label: 'name: string' },
                    ],
                },
            ],
        });
    });

    it('shows nothing outside a call', async () => {
        const { model, workerOf } = await declared('mandor;');
        const help = await signaturesOf(workerOf).provideSignatureHelp(model, endOf(model), token, {
            isRetrigger: false,
            triggerKind: languages.SignatureHelpTriggerKind.Invoke,
        });

        expect(help).toBeUndefined();
    });
});

describe('what a name is', () => {
    it('says the type of the name under the pointer, then its text, over the name', async () => {
        const { model, workerOf } = await declared('mandor.response;');
        const hover = await hoverOf(workerOf).provideHover(model, new Position(1, 10), token);

        expect(hover?.contents).toEqual([
            { value: '```typescript\n(property) Mandor.response: MandorResponse\n```' },
            { value: 'What came back.' },
        ]);
        expect(hover?.range).toMatchObject({ endColumn: 16, startColumn: 8 });
    });

    it('says nothing over a line with no name', async () => {
        const { model, workerOf } = await declared('mandor.response;\n\n');
        const hover = await hoverOf(workerOf).provideHover(model, new Position(2, 1), token);

        expect(hover).toBeUndefined();
    });
});
