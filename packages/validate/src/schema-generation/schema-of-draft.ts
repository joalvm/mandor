import { schemaFromValue } from '../schema-from-value/schema-from-value.js';

/** The schema a body generates, or nothing while the body is not json a parser can read. */
export function schemaOfDraft(payload: string): string | null {
    try {
        return schemaFromValue(JSON.parse(payload));
    } catch {
        return null;
    }
}
