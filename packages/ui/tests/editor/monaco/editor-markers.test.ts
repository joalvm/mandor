import { editor, MarkerSeverity } from 'monaco-editor/editor/editor.api.js';
import { describe, expect, it, vi } from 'vitest';

import '../../../src/editor/monaco/monaco-setup.js';
import type { EditorDiagnostic } from '../../../src/editor/editor-diagnostic.js';
import { lintModel } from '../../../src/editor/monaco/editor-markers.js';

/** A linter with one opinion: the first character of the text is wrong. */
function firstCharacter(text: string): EditorDiagnostic[] {
    if (text === '') {
        return [];
    }

    return [{ from: 0, message: `starts with ${text.charAt(0)}`, severity: 'error', to: 1 }];
}

function marksOf(model: editor.ITextModel): editor.IMarker[] {
    return editor.getModelMarkers({ resource: model.uri });
}

describe('the margin of a document', () => {
    it('marks the document the moment it starts', () => {
        const model = editor.createModel('ab', 'plaintext');
        const lint = lintModel(model, firstCharacter);

        expect(marksOf(model)).toMatchObject([
            {
                endColumn: 2,
                message: 'starts with a',
                severity: MarkerSeverity.Error,
                startColumn: 1,
            },
        ]);

        lint.dispose();
        model.dispose();
    });

    it('marks it again a pause after the text changes', async () => {
        const model = editor.createModel('ab', 'plaintext');
        const lint = lintModel(model, firstCharacter);

        model.setValue('xb');

        expect(marksOf(model)[0]?.message).toBe('starts with a');

        await vi.waitFor(() => {
            expect(marksOf(model)[0]?.message).toBe('starts with x');
        });

        lint.dispose();
        model.dispose();
    });

    it('tells a warning from an error', () => {
        const model = editor.createModel('ab', 'plaintext');
        const lint = lintModel(model, () => [
            { from: 0, message: 'w', severity: 'warning', to: 2 },
        ]);

        expect(marksOf(model)[0]?.severity).toBe(MarkerSeverity.Warning);

        lint.dispose();
        model.dispose();
    });

    it('takes its marks back when it stops', () => {
        const model = editor.createModel('ab', 'plaintext');

        lintModel(model, firstCharacter).dispose();

        expect(marksOf(model)).toEqual([]);

        model.dispose();
    });

    /** Two views of one text are one document: closing one leaves the other its marks. */
    it('keeps the marks while another view still checks the same document', () => {
        const model = editor.createModel('ab', 'plaintext');
        const kept = lintModel(model, firstCharacter);

        lintModel(model, firstCharacter).dispose();

        expect(marksOf(model)[0]?.message).toBe('starts with a');

        kept.dispose();

        expect(marksOf(model)).toEqual([]);

        model.dispose();
    });

    /** A document let go and opened again under the same name starts with a clean margin. */
    it('leaves no mark behind a document that goes away', () => {
        const model = editor.createModel('ab', 'plaintext');
        const { uri } = model;

        lintModel(model, firstCharacter);
        model.dispose();

        expect(editor.getModelMarkers({ resource: uri })).toEqual([]);
    });
});
