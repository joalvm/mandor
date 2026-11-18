import { HarParseError } from './har-parse-error.js';
import { harDocumentSchema, type HarDocument } from './har-schema.js';

/** Text to what the mapper reads, or a `HarParseError` that says why the file is not a HAR. */
export function parseHarDocument(text: string): HarDocument {
    const result = harDocumentSchema.safeParse(jsonOf(text));

    if (!result.success) {
        throw new HarParseError(
            result.error.issues.map(
                (issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`,
            ),
        );
    }

    if (result.data.log.entries.length === 0) {
        throw new HarParseError(['The HAR has no entries']);
    }

    return result.data;
}

function jsonOf(text: string): unknown {
    try {
        return JSON.parse(text);
    } catch (error) {
        throw new HarParseError([`The file is not JSON: ${String(error)}`]);
    }
}
