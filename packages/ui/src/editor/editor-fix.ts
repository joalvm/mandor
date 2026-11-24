/** A stretch of the text, by offsets, the end not included. */
type EditorSpan = { from: number; to: number };

/** One replacement a fix makes, in the offsets of the text the fix was asked for. */
type EditorEdit = EditorSpan & { text: string };

/** What the bulb offers: a title in the caller's words, and the replacements it makes. */
export type EditorFix = { title: string; edits: readonly EditorEdit[] };

/**
 * What the caller can fix in a text, around the lines the caret or the selection covers. The
 * first fix is the one the bulb offers first.
 */
export type FixesOf = (text: string, lines: EditorSpan) => readonly EditorFix[];
