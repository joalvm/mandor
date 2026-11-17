import type { RequestLine } from './request-line.js';

/** One row of a `form` body: the usual line, plus whether the value is text or a file of the repo. */
export type RequestFormField = RequestLine & { kind: 'text' | 'file' };

/**
 * What gets sent, one shape per type. A `json`, `text` or `xml` body keeps its content as
 * written, `{{var}}` included; a `urlencoded` or `form` body is lines; a `binary` body names one
 * file of the repo, relative to its root. A `graphql` body keeps the query as written and the
 * variables as JSON text, `{{var}}` included, like the `json` body: both are written in an editor.
 */
export type RequestBody =
    | { type: 'none' }
    | { type: 'json' | 'text' | 'xml'; content: string }
    | { type: 'urlencoded'; fields: RequestLine[] }
    | { type: 'form'; fields: RequestFormField[] }
    | { type: 'binary'; file: string }
    | { type: 'graphql'; query: string; variables: string; operationName?: string | undefined };

/**
 * The body of one type. An intersection, not an `Extract`: `json`, `text` and `xml` share one
 * shape, and extracting one of the three from it would find nothing.
 */
export type RequestBodyOf<T extends RequestBody['type']> = RequestBody & { type: T };
