import type { KeyValueMeta } from './request-line-meta.js';

/**
 * One row of query, headers or urlencoded fields, as the request keeps it: a list, because keys
 * repeat and the order they were written matters. `enabled: false` stays on disk — switching a
 * line off is not erasing it. An empty `key` is a row half typed, and the writer takes it out.
 */
export type RequestLine = {
    key: string;
    value: string;
    enabled: boolean;
    /** The JSON Schema of the value as text, when the document the row came from gave one. */
    schema?: string | undefined;
    /** Whether the document asks for the row. `enabled` is the person's; this one is the document's. */
    required?: boolean | undefined;
    /** What the row is for, in one line. Absent until somebody writes it. */
    description?: string | undefined;
    /** What the pair promises about its type, as the params table edits it. Absent says nothing. */
    meta?: KeyValueMeta | undefined;
};
