import { editor, Uri } from 'monaco-editor/editor/editor.api.js';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { constructionOptions } from '../../../src/editor/monaco/construction-options.js';
import '../../../src/editor/monaco/monaco-setup.js';
import type { EditorLanguage } from '../../../src/editor/editor-language.js';
import type { EditorSuggestion } from '../../../src/editor/editor-suggestion.js';
import { suggestModel } from '../../../src/editor/monaco/editor-suggestions.js';

let counter = 0;

/** An editor holding the text, with the caret at its end, over a document of the language. */
function editorOf(text: string, language: EditorLanguage = 'graphql') {
    counter += 1;

    const host = document.body.appendChild(document.createElement('div'));
    const uri = Uri.parse(`inmemory://mandor/s-${String(counter)}`);
    const model = editor.createModel(text, language, uri);
    const shown = editor.create(host, {
        ...constructionOptions({ ariaLabel: 'Editor', language, options: {} }),
        automaticLayout: false,
        model,
    });

    shown.setPosition(model.getPositionAt(text.length));
    shown.focus();

    return { host, model, shown };
}

async function askSuggestions(shown: editor.IStandaloneCodeEditor): Promise<void> {
    await shown.getAction('editor.action.triggerSuggest')?.run();
}

function rowsOf(host: HTMLElement): string[] {
    return [...host.querySelectorAll('.suggest-widget .monaco-list-row')].map(
        (row) => row.textContent,
    );
}

const USER: EditorSuggestion = { insertText: 'userName', kind: 'field', label: 'userName' };

afterEach(() => {
    editor.getEditors().forEach((shown) => {
        shown.getContainerDomNode().remove();
        shown.dispose();
    });
    editor.getModels().forEach((model) => {
        model.dispose();
    });
});

describe('the suggestions a caller gives an editor', () => {
    it('are the ones the widget lists, asked with the text and the offset of the caret', async () => {
        const suggestionsOf = vi.fn(() => [USER]);
        const { host, model, shown } = editorOf('{ us');

        suggestModel(model, suggestionsOf);
        await askSuggestions(shown);

        await vi.waitFor(() => {
            expect(rowsOf(host).join(' ')).toContain('userName');
        });
        expect(suggestionsOf).toHaveBeenCalledWith('{ us', 4);
    }, 15_000);

    it('replace the word under the caret when one is taken', async () => {
        const { host, model, shown } = editorOf('{ us');

        suggestModel(model, () => [USER]);
        await askSuggestions(shown);
        await vi.waitFor(() => {
            expect(rowsOf(host)).not.toHaveLength(0);
        });
        shown.trigger('test', 'acceptSelectedSuggestion', {});

        expect(model.getValue()).toBe('{ userName');
    }, 15_000);

    it('are given to the document that asked and to no other of the same language', async () => {
        const mine = editorOf('{ us');
        const other = editorOf('{ us');

        suggestModel(mine.model, () => [USER]);
        await askSuggestions(other.shown);

        await vi.waitFor(() => {
            expect(other.host.querySelector('.suggest-widget')?.textContent).toContain(
                'No suggestions',
            );
        });
        expect(rowsOf(other.host)).toEqual([]);
    }, 15_000);

    it('stop being given once the editor lets them go', async () => {
        const { host, model, shown } = editorOf('{ us');
        const given = suggestModel(model, () => [USER]);

        given.dispose();
        await askSuggestions(shown);

        await vi.waitFor(() => {
            expect(host.querySelector('.suggest-widget')?.textContent).toContain('No suggestions');
        });
    }, 15_000);
});
