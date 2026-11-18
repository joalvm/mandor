import { editor } from 'monaco-editor/editor/editor.api.js';
import { describe, expect, it } from 'vitest';

import type { EditorVariable } from '../../../src/editor/editor-variable.js';
import '../../../src/editor/monaco/monaco-setup.js';
import { paintVariables } from '../../../src/editor/monaco/variable-decorations.js';

const TEMPLATE = /\{\{([^}]*)\}\}/g;

/** Every template is known, except `lost`, which the environment has never heard of. */
function variablesOf(text: string): EditorVariable[] {
    return [...text.matchAll(TEMPLATE)].map((match) => ({
        from: match.index,
        name: match[1],
        to: match.index + match[0].length,
        tone: match[1] === 'lost' ? 'missing' : 'resolved',
    }));
}

function paintOf(model: editor.ITextModel): [string, number, number][] {
    return model
        .getAllDecorations()
        .filter(
            (decoration) =>
                decoration.options.inlineClassName?.startsWith('mandor-variable ') === true,
        )
        .map((decoration) => [
            decoration.options.inlineClassName ?? '',
            model.getOffsetAt(decoration.range.getStartPosition()),
            model.getOffsetAt(decoration.range.getEndPosition()),
        ]);
}

function mounted(value: string): { model: editor.ITextModel; shown: editor.IStandaloneCodeEditor } {
    const host = document.body.appendChild(document.createElement('div'));
    const model = editor.createModel(value, 'plaintext');

    return { model, shown: editor.create(host, { model }) };
}

describe('the variables of a document', () => {
    /** Every variable is set in italic by the one class, and keeps the tone it earned beside it. */
    it('marks each variable, with the tone the environment earned it', () => {
        const { model, shown } = mounted('{"a": "{{host}}", "b": {{lost}}}');
        const paint = paintVariables(shown, { variablesOf });

        expect(paintOf(model)).toEqual([
            ['mandor-variable mandor-variable-resolved', 7, 15],
            ['mandor-variable mandor-variable-missing', 23, 31],
        ]);

        paint.dispose();
        shown.dispose();
        model.dispose();
    });

    it('paints again as the text is written', () => {
        const { model, shown } = mounted('{{host}}');
        const paint = paintVariables(shown, { variablesOf });

        model.setValue('{{lost}} {{host}}');

        expect(paintOf(model)).toEqual([
            ['mandor-variable mandor-variable-missing', 0, 8],
            ['mandor-variable mandor-variable-resolved', 9, 17],
        ]);

        paint.dispose();
        shown.dispose();
        model.dispose();
    });

    it('takes its paint back when it stops', () => {
        const { model, shown } = mounted('{{host}}');

        paintVariables(shown, { variablesOf }).dispose();

        expect(paintOf(model)).toEqual([]);

        shown.dispose();
        model.dispose();
    });
});
