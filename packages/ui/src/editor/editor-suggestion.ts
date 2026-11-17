/** One entry of the list that opens while somebody writes: what it says and what it writes. */
export type EditorSuggestion = {
    detail?: string | undefined;
    documentation?: string | undefined;
    insertText: string;
    kind:
        | 'argument'
        | 'directive'
        | 'enum'
        | 'field'
        | 'fragment'
        | 'keyword'
        | 'other'
        | 'type'
        | 'variable';
    label: string;
};

/** What a caller suggests at a place of a text: the offset is the caret, counted in characters. */
export type SuggestionsOf = (text: string, offset: number) => readonly EditorSuggestion[];
