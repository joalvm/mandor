import { editor } from 'monaco-editor/editor/editor.api.js';
import { describe, expect, it } from 'vitest';

import '../../../src/editor/monaco/monaco-setup.js';
import { overwriteText, rangeOf, replaceText } from '../../../src/editor/monaco/model-text.js';

function offsetsOf(model: editor.ITextModel, id: string): number[] {
    const range = model.getDecorationRange(id);

    if (range === null) {
        return [];
    }

    return [model.getOffsetAt(range.getStartPosition()), model.getOffsetAt(range.getEndPosition())];
}

describe('the text of a document', () => {
    it('spells a span of offsets as the lines and columns of the document', () => {
        const model = editor.createModel('ab\ncd', 'plaintext');

        expect(rangeOf(model, 1, 4)).toEqual({
            endColumn: 2,
            endLineNumber: 2,
            startColumn: 2,
            startLineNumber: 1,
        });

        model.dispose();
    });

    /** Written over whole, every mark of the text would fold into the start of the document. */
    it('rewrites only the part that changed, so a mark elsewhere stays where it was', () => {
        const model = editor.createModel('{"a": 1, "b": 2}', 'plaintext');
        const [mark = ''] = model.deltaDecorations(
            [],
            [{ options: {}, range: rangeOf(model, 9, 12) }],
        );

        replaceText(model, '{"a": 9, "b": 2}');

        expect(model.getValue()).toBe('{"a": 9, "b": 2}');
        expect(offsetsOf(model, mark)).toEqual([9, 12]);

        model.dispose();
    });

    /** Nobody takes back what an editor only shows, and each step would hold the text it replaced. */
    it('overwrites a document only read with no step of undo, touching only what changed', () => {
        const model = editor.createModel('{"a": 1, "b": 2}', 'plaintext');
        const [mark = ''] = model.deltaDecorations(
            [],
            [{ options: {}, range: rangeOf(model, 9, 12) }],
        );

        overwriteText(model, '{"a": 9, "b": 2}');

        expect(model.getValue()).toBe('{"a": 9, "b": 2}');
        expect(offsetsOf(model, mark)).toEqual([9, 12]);
        expect(model.canUndo()).toBe(false);

        model.dispose();
    });

    it('takes the whole rewrite back in one undo', () => {
        const model = editor.createModel('{"a": 1}', 'plaintext');

        replaceText(model, '{\n    "a": 1\n}');
        void model.undo();

        expect(model.getValue()).toBe('{"a": 1}');

        model.dispose();
    });

    it('leaves an unchanged document untouched', () => {
        const model = editor.createModel('same', 'plaintext');
        const version = model.getVersionId();

        replaceText(model, 'same');
        overwriteText(model, 'same');

        expect(model.getVersionId()).toBe(version);

        model.dispose();
    });
});
