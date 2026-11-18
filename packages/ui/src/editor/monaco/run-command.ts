import { editor } from 'monaco-editor/editor/editor.api.js';

import { formattedJsonc } from '../jsonc-format.js';
import { formattedMarkup } from '../markup-format.js';
import { replaceText } from './model-text.js';

/** What a button of the app runs on an editor. The keys and the menu of the editor do the rest. */
export type EditorCommandId = 'format';

type Formatter = (text: string) => Promise<string | null> | string | null;

/** How each language is laid out. Prose has no layout to give, and bytes are never written. */
const FORMATTERS: Partial<Record<string, Formatter>> = {
    html: (text) => formattedMarkup(text, 'html'),
    jsonc: formattedJsonc,
    xml: (text) => formattedMarkup(text, 'xml'),
};

/** The document, while it can be written; nothing while it is only read. */
function writable(shown: editor.ICodeEditor): editor.ITextModel | null {
    const model = shown.getModel();

    return shown.getOption(editor.EditorOption.readOnly) ? null : model;
}

/** Lays the text out, as one step of undo. A text its language cannot read is left as it was. */
async function format(shown: editor.ICodeEditor): Promise<boolean> {
    const model = writable(shown);
    const formatter = model === null ? undefined : FORMATTERS[model.getLanguageId()];

    if (model === null || formatter === undefined) {
        return false;
    }

    const formatted = await formatter(model.getValue());

    if (formatted === null) {
        return false;
    }

    replaceText(model, formatted);

    return true;
}

const COMMANDS: Record<EditorCommandId, (shown: editor.ICodeEditor) => Promise<boolean>> = {
    format,
};

/**
 * Runs one command on an editor, and says whether it did anything. It never fails: a button has
 * nowhere to put a refusal, so a layout that breaks is nothing done.
 */
export function runCommand(shown: editor.ICodeEditor, id: EditorCommandId): Promise<boolean> {
    return COMMANDS[id](shown).catch(() => false);
}
