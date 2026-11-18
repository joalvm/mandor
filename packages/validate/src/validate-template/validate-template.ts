import { getNodeValue, parseTree, type Node, type ParseError } from 'jsonc-parser';

import { compileSchema } from '../compile-schema/compile-schema.js';
import { closestRangeOf } from '../text-range/range-of-pointer.js';
import type { SchemaIssue } from '../validate-value/schema-issue.js';
import { validateValue } from '../validate-value/validate-value.js';

/** JSONC, the way a payload is written: comments and a tolerated trailing comma pass. */
const PARSE_OPTIONS = { allowTrailingComma: true };

/** Where a template lives in the text. A template stands for whatever the schema asks for. */
const TEMPLATE = /\{\{[^}]*\}\}/g;

/** One refusal of the checker, carried to the place in the text that earned it. */
export type TemplateIssue = SchemaIssue & {
    from: number;
    to: number;
};

function overlaps(range: { from: number; to: number }, at: number, length: number): boolean {
    return range.from < at + length && at < range.to;
}

/**
 * What a text bound for the wire owes the schema: one refusal per offending field, carried to
 * the place in the text that earned it. A body the parser cannot read answers nothing — the
 * syntax linter is already speaking — and a template is never a refusal, because it stands for
 * whatever the schema asks for. The values are never resolved here: what this answers is what
 * the text itself can promise.
 */
export function validateTemplateText(schemaText: string, text: string): TemplateIssue[] {
    if (schemaText.trim() === '') {
        return [];
    }

    const errors: ParseError[] = [];
    const root: Node | undefined = parseTree(text, errors, PARSE_OPTIONS);

    if (errors.length > 0 || root === undefined) {
        return [];
    }

    const compiled = compileSchema(schemaText);

    if (!compiled.ok) {
        return [];
    }

    const templates = [...text.matchAll(TEMPLATE)].map(
        (match) => [match.index, match[0].length] as const,
    );

    return validateValue(compiled.schema, getNodeValue(root)).flatMap((issue) => {
        const range = closestRangeOf(root, issue.path);

        if (templates.some(([at, length]) => overlaps(range, at, length))) {
            return [];
        }

        return [{ ...issue, from: range.from, to: range.to }];
    });
}
