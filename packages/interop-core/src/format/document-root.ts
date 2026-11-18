import { parse } from 'yaml';

import { isRecord } from '../ir/is-record.js';

/**
 * The top-level object of a text that is JSON or YAML, or null when it is neither or holds no
 * object at its root. JSON goes first: it is the cheap way through a big recording, and YAML
 * only reads what JSON refused.
 */
export function documentRootOf(text: string): Record<string, unknown> | null {
    try {
        const root: unknown = JSON.parse(text);

        return isRecord(root) ? root : null;
    } catch {
        return yamlRootOf(text);
    }
}

function yamlRootOf(text: string): Record<string, unknown> | null {
    try {
        const root: unknown = parse(text);

        return isRecord(root) ? root : null;
    } catch {
        return null;
    }
}
