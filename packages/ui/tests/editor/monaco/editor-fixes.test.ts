import { editor, Uri } from 'monaco-editor/editor/editor.api.js';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { EditorFix } from '../../../src/editor/editor-fix.js';
import { constructionOptions } from '../../../src/editor/monaco/construction-options.js';
import '../../../src/editor/monaco/monaco-setup.js';
import { fixModel } from '../../../src/editor/monaco/editor-fixes.js';

let counter = 0;

/** An editor of scripts holding the text, with the caret where it says. */
function editorOf(text: string, caret = 0) {
    counter += 1;

    const host = document.body.appendChild(document.createElement('div'));
    const model = editor.createModel(
        text,
        'script',
        Uri.parse(`inmemory://mandor/fixes-${String(counter)}`),
    );
    const shown = editor.create(host, {
        ...constructionOptions({ ariaLabel: 'Editor', language: 'script', options: {} }),
        automaticLayout: false,
        model,
    });

    shown.setPosition(model.getPositionAt(caret));
    shown.focus();

    return { model, shown };
}

/** What the bulb does when its first fix is taken. */
function takeFirstFix(shown: editor.IStandaloneCodeEditor): void {
    shown.trigger('test', 'editor.action.codeAction', { apply: 'first', kind: 'quickfix' });
}

const RENAME: EditorFix = { edits: [{ from: 0, text: 'mandor', to: 2 }], title: 'Convert' };

afterEach(() => {
    editor.getEditors().forEach((shown) => {
        shown.getContainerDomNode().remove();
        shown.dispose();
    });
    editor.getModels().forEach((model) => {
        model.dispose();
    });
});

describe('the fixes the bulb offers', () => {
    it('are asked with the text and the lines of the caret, and make their edits', async () => {
        const text = 'pm.a;\npm.b;';
        const fixesOf = vi.fn(() => [RENAME]);
        const { model, shown } = editorOf(text, 1);

        fixModel(model, fixesOf);
        takeFirstFix(shown);

        await vi.waitFor(() => {
            expect(model.getValue()).toBe('mandor.a;\npm.b;');
        });
        expect(fixesOf).toHaveBeenCalledWith(text, { from: 0, to: 5 });
    });

    it('make every edit of a fix at once, in the offsets of the text they were asked for', async () => {
        const { model, shown } = editorOf('pm.a;\npm.b;');

        fixModel(model, () => [
            {
                edits: [
                    { from: 0, text: 'mandor', to: 2 },
                    { from: 6, text: 'mandor', to: 8 },
                ],
                title: 'Convert all',
            },
        ]);
        takeFirstFix(shown);

        await vi.waitFor(() => {
            expect(model.getValue()).toBe('mandor.a;\nmandor.b;');
        });
    });

    it('take the lines the selection covers', async () => {
        const fixesOf = vi.fn(() => []);
        const { model, shown } = editorOf('a;\nb;\nc;');

        fixModel(model, fixesOf);
        shown.setSelection({ endColumn: 2, endLineNumber: 2, startColumn: 2, startLineNumber: 1 });
        takeFirstFix(shown);

        await vi.waitFor(() => {
            expect(fixesOf).toHaveBeenCalledWith('a;\nb;\nc;', { from: 0, to: 5 });
        });
    });

    it('are none for a document nobody fixes, or no longer does', async () => {
        const kept = editorOf('pm.a;');
        const fixed = editorOf('pm.a;');
        const fixesOf = vi.fn(() => [RENAME]);

        fixModel(kept.model, () => []).dispose();
        fixModel(fixed.model, fixesOf).dispose();
        takeFirstFix(kept.shown);
        takeFirstFix(fixed.shown);

        // The bulb asks each provider for every document: the one it asks is ours, and answers nothing.
        await vi.waitFor(() => {
            expect(fixed.model.getValue()).toBe('pm.a;');
        });
        expect(kept.model.getValue()).toBe('pm.a;');
        expect(fixesOf).not.toHaveBeenCalled();
    });

    it('stay with the caller that fixes the document now', async () => {
        const { model, shown } = editorOf('pm.a;');
        const first = fixModel(model, () => []);

        fixModel(model, () => [RENAME]);
        first.dispose();
        takeFirstFix(shown);

        await vi.waitFor(() => {
            expect(model.getValue()).toBe('mandor.a;');
        });
    });
});
