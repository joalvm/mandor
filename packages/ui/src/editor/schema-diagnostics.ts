import { compileSchema, validateTemplateText } from '@mandor/validate';

import type { EditorDiagnostic } from './editor-diagnostic.js';

/**
 * What a payload that breaks its schema owes the margin: one mark per offending field, on the
 * range the field occupies. A schema that cannot be read is said once, across the whole text —
 * an error never disappears by not knowing where to put it.
 */
export function schemaDiagnostics(text: string, schemaText: string): EditorDiagnostic[] {
    if (schemaText.trim() === '') {
        return [];
    }

    const compiled = compileSchema(schemaText);

    if ('waiting' in compiled) {
        return [];
    }

    if (!compiled.ok) {
        return [{ from: 0, message: compiled.message, severity: 'warning', to: text.length }];
    }

    return validateTemplateText(schemaText, text).map((issue) => ({
        from: issue.from,
        message: issue.message,
        rule: { keyword: issue.keyword, params: issue.params },
        severity: 'error',
        to: issue.to,
    }));
}
