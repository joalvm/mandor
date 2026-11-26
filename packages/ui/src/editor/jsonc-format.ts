import { format, type Edit, type FormattingOptions } from 'jsonc-parser';

import { codePreferences } from './code-preferences.js';
import { jsoncSyntaxErrors } from './jsonc-diagnostics.js';
import { maskedTemplates } from './template-mask.js';

/** The layout steps in by the indent the editors type with, so a laid out payload reads as one. */
function layoutOptions(): FormattingOptions {
    const { indentSize, indentWithTabs } = codePreferences();

    return { eol: '\n', insertSpaces: !indentWithTabs, tabSize: indentSize };
}

/**
 * The edits of a layout applied in one pass. A layout is one edit per gap between tokens, and
 * `applyEdits` of the library rebuilds the whole text for each: a megabyte took minutes of a
 * frozen window. The edits of a layout never overlap, so the text is cut once, in order.
 */
function appliedEdits(text: string, edits: readonly Edit[]): string {
    const pieces: string[] = [];
    let at = 0;

    for (const edit of edits.toSorted((one, other) => one.offset - other.offset)) {
        pieces.push(text.slice(at, edit.offset), edit.content);
        at = edit.offset + edit.length;
    }

    pieces.push(text.slice(at));

    return pieces.join('');
}

/**
 * The text laid out, with its comments and templates where they were written: the layout only
 * moves the whitespace between tokens. Templates are masked to be read, and since a mask keeps
 * every offset, the edits computed on it land on the real text untouched. A text that does not
 * parse is left alone — laying it out would carry the error away from where the person left it.
 * A trailing comma is no such error: the layout keeps it where it was, and its mark with it.
 */
export function formattedJsonc(text: string): string | null {
    if (jsoncSyntaxErrors(text).length > 0) {
        return null;
    }

    return appliedEdits(text, format(maskedTemplates(text), undefined, layoutOptions()));
}
