import type { HttpResponse } from '@mandor/schema';
import type { SchemaIssue } from '@mandor/validate';

import { textOfResponse } from '../example-of.js';

import { schemaViolations } from './schema-violations.js';

/** The schema an answer answers to, the rules of it the answer breaks, and the body it judged. */
export type AnswerVerdict = { issues: SchemaIssue[]; judged: string; text: string };

/**
 * An answer set against the schema it answers to. Nothing when there is none; a schema that
 * cannot be read breaks nothing, and its editor says why.
 */
export function answerVerdict(
    text: string | undefined,
    response: HttpResponse,
): AnswerVerdict | undefined {
    if (text === undefined || text.trim() === '') {
        return undefined;
    }

    const judged = textOfResponse(response);
    const found = schemaViolations(text, judged);

    return { issues: Array.isArray(found) ? found : [], judged, text };
}
