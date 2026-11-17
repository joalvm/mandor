/**
 * One way a value does not meet the schema. The path runs inside the value —`/user/name`— and it
 * is empty when the value itself is the refusal. The keyword names the rule of JSON Schema that
 * refused it, and its params say what the rule asked and what it got, each as text: who shows
 * the issue words it from those two. The schema path is where the rule sits inside the schema,
 * as a JSON Pointer, and it is empty when the checker cannot tell. The message stays in the
 * checker's own words, in English, for logs and for whoever has no words of its own.
 */
export type SchemaIssue = {
    path: string;
    keyword: string;
    params: Record<string, string>;
    schemaPath: string;
    message: string;
};

/** Reads what a value is as a schema record: an object, and never an array. */
export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
