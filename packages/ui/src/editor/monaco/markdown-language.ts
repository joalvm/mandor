import { editor, KeyCode, KeyMod, languages, Range } from 'monaco-editor/editor/editor.api.js';

import { enterInList } from '../markdown-list.js';
import { MARKDOWN_PREVIEW_EVENT } from '../markdown-preview.js';
import { MARKDOWN_CONFIGURATION, MARKDOWN_MONARCH } from './markdown-monarch.js';

/** Where the keys of markdown count: an editor of markdown, with the focus, that can be written. */
const IN_MARKDOWN = 'editorTextFocus && editorLangId == markdown && !editorReadonly';

const SOURCE = 'markdown';

function continueList(shown: editor.ICodeEditor): void {
    const position = shown.getPosition();
    const model = shown.getModel();

    if (position === null || model === null) {
        return;
    }

    const line = position.lineNumber;
    const typed = enterInList(model.getLineContent(line), position.column);

    if (typed === null) {
        shown.executeEdits(SOURCE, [
            { range: new Range(line, 1, line, model.getLineMaxColumn(line)), text: '' },
        ]);

        return;
    }

    shown.trigger(SOURCE, 'type', { text: typed });
}

/*
 * Markdown is registered here and not through the definition Monaco ships: that one loads a
 * grammar of its own the first time a document asks for it, and would write over this one.
 */
languages.register({
    aliases: ['Markdown', 'markdown'],
    extensions: ['.md', '.markdown'],
    id: 'markdown',
});
languages.setMonarchTokensProvider('markdown', MARKDOWN_MONARCH);
languages.setLanguageConfiguration('markdown', MARKDOWN_CONFIGURATION);

editor.addEditorAction({
    id: 'markdown.continueList',
    keybindings: [KeyCode.Enter],
    label: 'Continue List',
    precondition: `${IN_MARKDOWN} && !suggestWidgetVisible && !inSnippetMode`,
    run: continueList,
});

editor.addEditorAction({
    id: 'markdown.togglePreview',
    keybindings: [KeyMod.chord(KeyMod.CtrlCmd | KeyCode.KeyK, KeyCode.KeyV)],
    label: 'Open Preview to the Side',
    precondition: 'editorTextFocus && editorLangId == markdown',
    run: (shown) => {
        shown
            .getContainerDomNode()
            .dispatchEvent(new CustomEvent(MARKDOWN_PREVIEW_EVENT, { bubbles: true }));
    },
});
