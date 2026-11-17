import { editor, Uri } from 'monaco-editor/editor/editor.api.js';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { constructionOptions } from '../../../src/editor/monaco/construction-options.js';
import '../../../src/editor/monaco/monaco-setup.js';
import '../../../src/editor/monaco/schema-language.js';

/** An editor of the app, built the way the pane builds it and holding a schema half written. */
function editorOf(text: string): {
    host: HTMLElement;
    model: editor.ITextModel;
    shown: editor.IStandaloneCodeEditor;
} {
    const host = document.body.appendChild(document.createElement('div'));
    const model = editor.createModel(text, 'json', Uri.parse('inmemory://mandor/suggest-test'));
    const shown = editor.create(host, {
        ...constructionOptions({ ariaLabel: 'Schema', language: 'json', options: {} }),
        automaticLayout: false,
        model,
        wordWrap: 'off',
    });

    return { host, model, shown };
}

describe('the suggestions of the schema language', () => {
    afterEach(() => {
        editor.getModels().forEach((model) => {
            model.dispose();
        });
        editor.getEditors().forEach((shown) => {
            shown.getContainerDomNode().remove();
            shown.dispose();
        });
    });

    it('offers the keywords of the standard over the colon of a property', async () => {
        const { host, shown } = editorOf('{ "type": "object", "prop');

        shown.setPosition({ column: '{ "type": "object", "prop'.length + 1, lineNumber: 1 });
        shown.focus();

        const action = shown.getAction('editor.action.triggerSuggest');

        expect(action).not.toBeNull();

        await action?.run();

        await vi.waitFor(
            () => {
                expect(host.querySelector('.suggest-widget')).not.toBeNull();
            },
            { timeout: 5_000 },
        );

        const row = host.querySelector('.suggest-widget .monaco-list-row')?.textContent ?? '';

        expect(row.length).toBeGreaterThan(0);
    }, 15_000);

    /** The widget paints on a timer of its own: unmounting the editor closes that road. */
    it('answers the trigger only while the editor is on the page', async () => {
        const { host, shown } = editorOf('{ "prop');
        const lines = host.querySelector('.view-lines');

        expect(lines).not.toBeNull();

        shown.setPosition({ column: '{ "prop'.length + 1, lineNumber: 1 });
        shown.focus();

        const action = shown.getAction('editor.action.triggerSuggest');

        expect(action).not.toBeNull();

        await action?.run();

        await vi.waitFor(
            () => {
                expect(host.querySelector('.suggest-widget')).not.toBeNull();
            },
            { timeout: 5_000 },
        );

        // The editor goes before the test does: the widget has no editor to paint on.
        shown.getContainerDomNode().remove();
        shown.dispose();

        await expect
            .poll(() => host.querySelector('.suggest-widget'), { timeout: 2_000 })
            .toBeNull();
    }, 15_000);
});
