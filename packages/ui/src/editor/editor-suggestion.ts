/** One entry of the list that opens while somebody writes: what it says and what it writes. */
export type EditorSuggestion = {
    detail?: string | undefined;
    documentation?: string | undefined;
    /**
     * The offset the text it writes starts at, on the line of the caret: what stands between it
     * and the caret is replaced. With none, the word at the caret is.
     */
    from?: number | undefined;
    /** What it writes; for a snippet, with its places to fill (`${1:name}`, `$0`). */
    insertText: string;
    kind:
        | 'argument'
        | 'directive'
        | 'enum'
        | 'field'
        | 'fragment'
        | 'keyword'
        | 'other'
        | 'snippet'
        | 'type'
        | 'variable';
    label: string;
};

/** What a caller suggests at a place of a text: the offset is the caret, counted in characters. */
export type SuggestionsOf = (text: string, offset: number) => readonly EditorSuggestion[];

/**
 * What a caller proposes to write after the caret, shown greyed until Tab takes it; nothing
 * where it has nothing to propose.
 */
export type GhostTextOf = (text: string, offset: number) => string | undefined;
