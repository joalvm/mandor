import { asRecord } from '../document/node-access.js';

/**
 * A sample or a schema travels as text; this is the way back to its keys. A text that is not a
 * JSON object — a plain string sample, a broken copy — has no keys to give, and says so with an
 * empty record instead of failing an import over a value the person can fix.
 */
export function jsonRecordOf(text: string | undefined): Record<string, unknown> {
    if (text === undefined) {
        return {};
    }

    try {
        return asRecord(JSON.parse(text));
    } catch {
        return {};
    }
}
