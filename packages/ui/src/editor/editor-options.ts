import type { DiagnosticsOf, EditorRule } from './editor-diagnostic.js';
import type { EditorLanguage } from './editor-language.js';
import type { GhostTextOf, SuggestionsOf } from './editor-suggestion.js';
import type { EditorVariables } from './editor-variable.js';

/** The schema a payload is checked against while it is written, read again on every check. */
export type SchemaLint = {
    schema: () => string;
};

/** Says one mark in the caller's words; a mark of a schema hands its rule along with its English. */
export type EditorTranslate = (message: string, rule?: EditorRule) => string;

/**
 * What a caller decides about one editor. Everything else is the same in every editor of the
 * app, and a caller that wants it different is asking for a second editor.
 *
 * `check`, `ghostText` and `suggest` are functions the editor compares by identity, like every option: a
 * caller that builds them inline gets an editor that is rebuilt on every render, so they come
 * out of `useMemo`.
 */
export type EditorOptions = {
    /** Marks the caller adds to those of the language, over a text it knows better than the editor. */
    check?: DiagnosticsOf | undefined;
    /**
     * What a script is checked against: the declarations of the names its moment shows, read only
     * by the language of scripts.
     */
    declarations?: string | undefined;
    /** Takes the caret as soon as it is built, for an editor its reader opened to write in. */
    focusOnMount?: boolean | undefined;
    /** What the caller proposes after the caret, greyed until Tab takes it; with none, nothing. */
    ghostText?: GhostTextOf | undefined;
    lineNumbers?: 'off' | 'on' | undefined;
    readOnly?: boolean | undefined;
    schemaLint?: SchemaLint | undefined;
    /** What the caller suggests while the text is written; with none, the editor suggests nothing. */
    suggest?: SuggestionsOf | undefined;
    translate?: EditorTranslate | undefined;
    /**
     * Marks what hides or passes for another letter: a bidi, a space of no width, a Cyrillic `а`.
     * For text that runs, where that is a trick; a body in another alphabet is only a body.
     */
    unicodeHighlight?: boolean | undefined;
    variables?: EditorVariables | undefined;
    wordWrap?: 'off' | 'on' | undefined;
};

/** Whether an editor is only read. Bytes are what arrived, so nobody writes them, whoever asks. */
export function isReadOnly(language: EditorLanguage, options: EditorOptions): boolean {
    return language === 'binary' || options.readOnly === true;
}
