import type { HttpResponse, RequestExample } from '@mandor/schema';
import type { SchemaIssue } from '@mandor/validate';

import { textOfResponse } from '../example-of.js';

import { compareBodies } from './compare-bodies.js';
import { compareFacts, type FactDifference } from './compare-facts.js';
import { statusMatches } from './compare-status.js';
import { schemaViolations } from './schema-violations.js';

export type ExampleComparison = {
    /** Values of the same type with other content: they can be taken, they are no difference. */
    changes: number;
    /** What the badge counts: the shape and the status that differ. The schema counts apart. */
    count: number;
    /** The headers and cookies the example declared that came otherwise, or did not come. */
    facts: FactDifference[];
    json: boolean;
    /** Nothing differs and nothing changed: the example is the answer. */
    quiet: boolean;
    received: HttpResponse;
    /** The text of the schema the answer was set against: the one of the status that came. */
    schema: string | undefined;
    /** Why the schema could not be read, when it could not; the answer was checked against nothing. */
    schemaError?: string;
    statusDiffers: boolean;
    /** Whether the shape, the content or the status differ: accepting the answer mends these, not the schema. */
    valuesDiffer: boolean;
    /** The rules of the schema the answer breaks, which the Schema tab lists under its text. */
    violations: SchemaIssue[];
};

/**
 * An example set against the response that came: its status, its body key by key, and the
 * headers and cookies it declares, where one that did not come is a difference and one that came
 * otherwise a change. The rules of the schema of that status the body breaks, when there is a
 * schema, ride along for the Schema tab: they are not a difference between example and answer.
 */
export function compareExample(
    example: RequestExample,
    response: HttpResponse,
    schemaText?: string,
): ExampleComparison {
    const received = textOfResponse(response);
    const bodies = compareBodies(example.body, received);
    const statusDiffers = !statusMatches(example.status, response.status);
    const checked = schemaViolations(schemaText, received);
    const violations = Array.isArray(checked) ? checked : [];
    const facts = compareFacts(example, response);
    const missing = facts.filter((fact) => fact.received === undefined).length;
    const differences = bodies.differences + missing + (statusDiffers ? 1 : 0);
    const changes = bodies.changes + facts.length - missing;

    return {
        changes,
        count: differences,
        facts,
        json: bodies.json,
        quiet: differences + changes === 0,
        received: response,
        schema: schemaText,
        ...(!Array.isArray(checked) && { schemaError: checked.error }),
        statusDiffers,
        valuesDiffer: differences + changes > 0,
        violations,
    };
}

/**
 * The rules the answer broke under a schema, when that schema is the one it was set against: an
 * answer of another status answers to the schema of that status, and says nothing of this one.
 */
export function violationsAgainst(
    comparison: ExampleComparison | undefined,
    schema: string | undefined,
): SchemaIssue[] {
    return comparison !== undefined && comparison.schema === schema ? comparison.violations : [];
}
