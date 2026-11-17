import {
    compileSchema as compileNode,
    draft04,
    draft06,
    draft07,
    draft2019,
    draft2020,
    type JsonSchema,
    type SchemaNode,
} from 'json-schema-library';
import { addFormats } from 'json-schema-library/formats';

/**
 * Every dialect the checker reads, the newest last: a schema that names none with `$schema` is
 * read as 2020-12, the dialect of OpenAPI 3.1, and one that names an older draft is read as that
 * draft. Each knows every format JSON Schema names, the ones of hosts and addresses included.
 */
const DRAFTS = [draft04, draft06, draft07, draft2019, draft2020];

addFormats(DRAFTS);

/**
 * The checker's node for the schema, or why the schema is none. A format is asserted, not only
 * noted: a value that says it is a date and is not one is a value the user wants to hear about.
 */
export function nodeOf(parsed: unknown): SchemaNode | string {
    try {
        const node = compileNode(parsed as JsonSchema, { drafts: DRAFTS, formatAssertion: true });
        const problem = node.schemaErrors?.[0];

        return problem === undefined ? node : problem.message;
    } catch (thrown) {
        return `the schema cannot be read: ${(thrown as Error).message}`;
    }
}
