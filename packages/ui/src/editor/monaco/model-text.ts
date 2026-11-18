import type { editor, IRange } from 'monaco-editor/editor/editor.api.js';

import { minimalEdit } from '../minimal-edit.js';

/** A span of offsets, spelled in the lines and columns the editor counts in. */
export function rangeOf(model: editor.ITextModel, from: number, to: number): IRange {
    const start = model.getPositionAt(from);
    const end = model.getPositionAt(to);

    return {
        endColumn: end.column,
        endLineNumber: end.lineNumber,
        startColumn: start.column,
        startLineNumber: start.lineNumber,
    };
}

/**
 * The edit that makes the document read the text, touching only the part that differs, or none.
 * The document breaks lines with `\n`: a `\r` written into it would break a line of its own.
 */
function editOf(
    model: editor.ITextModel,
    next: string,
): editor.IIdentifiedSingleEditOperation | null {
    const edit = minimalEdit(model.getValue(), next.replace(/\r\n?/g, '\n'));

    return edit === null ? null : { range: rangeOf(model, edit.from, edit.to), text: edit.text };
}

/** Makes the document read the text as one step of undo, for a document someone writes in. */
export function replaceText(model: editor.ITextModel, next: string): void {
    const edit = editOf(model, next);

    if (edit === null) {
        return;
    }

    model.pushStackElement();
    model.pushEditOperations([], [edit], () => null);
    model.pushStackElement();
}

/**
 * Makes a document nobody writes in read the text, and keeps no step of undo: none could be taken,
 * and each would hold the text it replaced for as long as the document lives — a response a
 * minute, through a working day.
 */
export function overwriteText(model: editor.ITextModel, next: string): void {
    const edit = editOf(model, next);

    if (edit !== null) {
        model.applyEdits([edit]);
    }
}
