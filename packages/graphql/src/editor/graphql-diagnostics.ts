import type { GraphQLSchema } from 'graphql';
import { getDiagnostics } from 'graphql-language-service';

import { lspTextOf } from './lsp-text.js';
import { offsetOf, type TextPosition } from './text-offsets.js';

/** One mark in the editor: what is wrong and over which characters, the shape `@mandor/ui` draws. */
export type GraphqlDiagnostic = {
    from: number;
    message: string;
    severity: 'error' | 'warning';
    to: number;
};

type Found = {
    message: string | { value: string };
    range: { end: TextPosition; start: TextPosition };
    severity?: number | undefined;
    source?: string | undefined;
};

const ERROR = 1;

/** The language service ends a validation mark one character past its token; a syntax mark is exact. */
const VALIDATION = 'GraphQL: Validation';

function markOf(text: string, found: Found): GraphqlDiagnostic {
    const overshoot = found.source === VALIDATION ? 1 : 0;
    const to = Math.min(text.length, offsetOf(text, found.range.end) - overshoot);
    const from = Math.min(offsetOf(text, found.range.start), Math.max(0, to - 1));

    return {
        from,
        message: lspTextOf(found.message),
        severity: found.severity === ERROR ? 'error' : 'warning',
        to: Math.max(to, from + 1),
    };
}

/**
 * The marks of a query: syntax errors always, and what the schema disagrees with when there is
 * one. A mark has to cover a character to be drawn, so one that lands past the end of the text,
 * as an unfinished query does, reaches back over the last character.
 */
export function graphqlDiagnostics(
    schema: GraphQLSchema | null,
): (text: string) => GraphqlDiagnostic[] {
    return (text) => {
        if (text.trim() === '') {
            return [];
        }

        return getDiagnostics(text, schema ?? undefined).map((found) => markOf(text, found));
    };
}
