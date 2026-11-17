/**
 * The rule a mark of a schema speaks for: its keyword and what it asked and got, so whoever
 * mounted the editor can say it in its own words instead of the checker's English.
 */
export type EditorRule = {
    keyword: string;
    params: Readonly<Record<string, string>>;
};

/** One mark of the margin: the range it covers, what it says and how loud it says it. */
export type EditorDiagnostic = {
    from: number;
    to: number;
    message: string;
    /** The rule of the schema behind the mark; a mark of the syntax has none. */
    rule?: EditorRule | undefined;
    severity: 'error' | 'warning';
};

/** Reads a text and says what is wrong with it, over the range that is. */
export type DiagnosticsOf = (text: string) => EditorDiagnostic[];
