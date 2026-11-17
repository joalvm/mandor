/** Past this size a row does not parse a payload, to name it or to judge it: the detail weighs it. */
const PARSE_LIMIT = 64 * 1024;

/** A payload a row may read: a json object small enough to parse while the timeline scrolls. */
export function isParsablePayload(data: string): boolean {
    return data.length <= PARSE_LIMIT && data.startsWith('{');
}
