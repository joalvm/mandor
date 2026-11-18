import type { DiagnosticsOf } from './editor-diagnostic.js';
import type { EditorLanguage } from './editor-language.js';
import type { EditorOptions, EditorTranslate } from './editor-options.js';
import { jsoncDiagnostics } from './jsonc-diagnostics.js';
import { schemaDiagnostics } from './schema-diagnostics.js';
import { xmlDiagnostics } from './xml-diagnostics.js';

function jsoncChecks(options: EditorOptions): DiagnosticsOf {
    const schemaLint = options.schemaLint;

    if (schemaLint === undefined) {
        return jsoncDiagnostics;
    }

    // The schema is written beside the payload, so every check reads it again.
    return (text) => [...jsoncDiagnostics(text), ...schemaDiagnostics(text, schemaLint.schema())];
}

/** The languages with a syntax to break. Prose, pages and bytes have none worth a mark. */
const CHECKS: Partial<Record<EditorLanguage, (options: EditorOptions) => DiagnosticsOf>> = {
    jsonc: jsoncChecks,
    xml: () => xmlDiagnostics,
};

/**
 * Every mark of one check said in the words of whoever mounted the editor. The parsers answer
 * in English, and the person reading the margin is writing a payload in the language the window
 * is drawn in: what a caller cannot translate it hands back as it came.
 */
function saidBy(check: DiagnosticsOf, translate: EditorTranslate): DiagnosticsOf {
    return (text) =>
        check(text).map((diagnostic) => ({
            ...diagnostic,
            message: translate(diagnostic.message, diagnostic.rule),
        }));
}

/** The marks of the language, in the caller's words, and then those the caller adds as it wrote them. */
function withCallerChecks(own: DiagnosticsOf | null, added: DiagnosticsOf | undefined) {
    if (added === undefined) {
        return own;
    }

    return own === null ? added : (text: string) => [...own(text), ...added(text)];
}

/**
 * What the margin of one editor checks, or nothing. A reader cannot fix what a mark would point
 * at, so a document that cannot change is not checked at all. What the caller asks to check
 * is added to what the language checks, and a language with no check of its own is still
 * checked for it.
 */
export function diagnosticsOf(
    language: EditorLanguage,
    options: EditorOptions,
): DiagnosticsOf | null {
    const checks = CHECKS[language];

    if (options.readOnly === true) {
        return null;
    }

    const own = checks?.(options);
    const said =
        own === undefined || options.translate === undefined ? own : saidBy(own, options.translate);

    return withCallerChecks(said ?? null, options.check);
}
