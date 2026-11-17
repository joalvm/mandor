/**
 * Signs a shell or a page escapes and no field means with the backslash: `\&`, `\=`, `\[`, `\/`.
 * A letter, a quote, a backslash and a brace are left: `\t`, `\"` and `\\` are text of the value,
 * and `\{{` is how a request writes a literal placeholder.
 */
const ESCAPED_SIGN = /\\([&?=#;|<>()[\]!$*~^`%+,:@/-])/g;
const ESCAPED_LINE_BREAK = /\\[ \t]*\r?\n[ \t]*/g;

/** A value that is not a body, as it was meant, whatever quotes it travelled between. */
export function withoutShellEscapes(text: string): string {
    return text.replace(ESCAPED_LINE_BREAK, '').replace(ESCAPED_SIGN, '$1');
}
