import type { HttpResponse } from '@mandor/schema';
import type { SchemaIssue } from '@mandor/validate';

import { answerVerdict } from './answer-verdict.js';

/** The first rule the schema still holds against the answer, and the dotted path of its value. */
export type RemainingViolation = { path: string; rule: SchemaIssue };

/** A JSON pointer as a dotted path; the root, which has no name, is `$`. */
function dottedPath(pointer: string): string {
    return pointer === '' ? '$' : pointer.slice(1).split('/').join('.');
}

/**
 * The first rule of the schema the answer still breaks, for whoever takes the answer as the
 * example and must be told the schema did not follow. Nothing when the answer keeps the schema,
 * when there is no schema, or when the schema cannot be read.
 */
export function firstViolation(
    schema: string | undefined,
    response: HttpResponse,
): RemainingViolation | undefined {
    const first = answerVerdict(schema, response)?.issues[0];

    return first === undefined ? undefined : { path: dottedPath(first.path), rule: first };
}
