import type { Degradation } from '../resource/degradation.js';
import type { RequestBody, RequestFormField } from '@mandor/schema';

/** The body a document carried as Mandor holds it, and what had to be given up on the way. */
export type BodyMapping = { body: RequestBody; degradations: Degradation[] };

/** One row of a multipart body: the field it becomes, if any, and what was given up for it. */
export type FormRow = { field?: RequestFormField; degradations: Degradation[] };

/** The form body the rows make: the fields that survived, and every degradation, in order. */
export function formBodyOf(rows: readonly FormRow[]): BodyMapping {
    return {
        body: { type: 'form', fields: rows.flatMap((row) => (row.field ? [row.field] : [])) },
        degradations: rows.flatMap((row) => row.degradations),
    };
}
