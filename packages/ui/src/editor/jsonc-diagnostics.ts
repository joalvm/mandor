import { trailingCommas } from '@mandor/validate';
import { parse, printParseErrorCode, type ParseError } from 'jsonc-parser';

import type { EditorDiagnostic } from './editor-diagnostic.js';
import { maskedTemplates } from './template-mask.js';

/**
 * JSONC, the way the editor reads it: comments pass, and so does nothing. A trailing comma is
 * parsed through so it does not hide the errors after it, and is marked on its own, over the
 * comma: JSON refuses it, and naming it beats a `Property expected` at the brace.
 */
const PARSE_OPTIONS = { allowEmptyContent: true, allowTrailingComma: true };

/** The words a person reads for each code the parser answers with. */
const MESSAGES: Readonly<Record<ReturnType<typeof printParseErrorCode>, string>> = {
    '<unknown ParseErrorCode>': 'Syntax error',
    CloseBraceExpected: 'Closing brace expected',
    CloseBracketExpected: 'Closing bracket expected',
    ColonExpected: 'Colon expected',
    CommaExpected: 'Comma expected',
    EndOfFileExpected: 'End of file expected',
    InvalidCharacter: 'Invalid characters in string. Control characters must be escaped.',
    InvalidCommentToken: 'Invalid comment token',
    InvalidEscapeCharacter: 'Invalid escape character in string',
    InvalidNumberFormat: 'Invalid number format',
    InvalidSymbol: 'Invalid symbol',
    InvalidUnicode: 'Invalid unicode sequence in string',
    PropertyNameExpected: 'Property expected',
    UnexpectedEndOfComment: 'Unexpected end of comment',
    UnexpectedEndOfNumber: 'Unexpected end of number',
    UnexpectedEndOfString: 'Unexpected end of string',
    ValueExpected: 'Value expected',
};

/** A mark with no width draws no squiggle and no hover: the error owns a character. */
function rangeOf(error: ParseError, length: number): Pick<EditorDiagnostic, 'from' | 'to'> {
    const from = Math.min(error.offset, length);
    const to = Math.min(from + error.length, length);

    if (to > from) {
        return { from, to };
    }

    if (from < length) {
        return { from, to: from + 1 };
    }

    return { from: Math.max(from - 1, 0), to: from };
}

/** Every syntax error of a JSONC text, over the token that broke it, with templates read as values. */
export function jsoncSyntaxErrors(text: string): EditorDiagnostic[] {
    const errors: ParseError[] = [];

    parse(maskedTemplates(text), errors, PARSE_OPTIONS);

    return errors.map((error) => ({
        ...rangeOf(error, text.length),
        message: MESSAGES[printParseErrorCode(error.error)],
        severity: 'error',
    }));
}

/** The syntax errors and every trailing comma, in the order they are written. */
export function jsoncDiagnostics(text: string): EditorDiagnostic[] {
    const commas = trailingCommas(maskedTemplates(text)).map((from): EditorDiagnostic => ({
        from,
        message: 'Trailing comma',
        severity: 'error',
        to: from + 1,
    }));

    return [...jsoncSyntaxErrors(text), ...commas].toSorted((one, other) => one.from - other.from);
}
