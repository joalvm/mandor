import { compileSchema } from '../../src/compile-schema/compile-schema.js';
import type { SchemaIssue } from '../../src/validate-value/schema-issue.js';
import { validateValue } from '../../src/validate-value/validate-value.js';

/** One refusal a test expects: the schema, the value it refuses and the issue it says. */
export type Refused = {
    name: string;
    schema: unknown;
    value: unknown;
    issue: Partial<SchemaIssue>;
};

/** The issues a schema written as a value finds in a value; a schema that fails to compile fails the test. */
export function issuesOf(schema: unknown, value: unknown): SchemaIssue[] {
    const result = compileSchema(typeof schema === 'string' ? schema : JSON.stringify(schema));

    if (!result.ok) {
        throw new Error(`the schema of this test has to compile: ${JSON.stringify(result)}`);
    }

    return validateValue(result.schema, value);
}
