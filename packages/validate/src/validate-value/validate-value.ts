import { schemaOf, type CompiledSchema } from '../compiled-schema/compiled-schema.js';

import { issueOf } from './issue-of.js';
import type { SchemaIssue } from './schema-issue.js';

/** Every way the value does not meet the schema; none when it does. */
export function validateValue(schema: CompiledSchema, value: unknown): SchemaIssue[] {
    const read = schemaOf(schema);

    if (read === undefined) {
        return [];
    }

    const issues = read.node.validate(value).errors.map((error) => issueOf(error, read.places));

    // Draft 4 wrote an exclusive bound as a flag beside the bound, and the checker reads the
    // pair twice: one refusal is said once.
    return issues.filter(
        (issue, index) => issues.findIndex((other) => sameIssue(issue, other)) === index,
    );
}

function sameIssue(one: SchemaIssue, other: SchemaIssue): boolean {
    return one.path === other.path && one.message === other.message;
}
