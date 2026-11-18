import { allSpotsOf } from '../schema-strictness/schema-spots.js';
import { isRecord } from '../validate-value/schema-issue.js';

import { NEEDS_UNICODE, uncheckedPattern } from './pattern-risk.js';

// A pattern with a quantifier inside a quantifier backtracks exponentially in the length of the
// text, and the schema and the frames it checks can come from the same hand. The app has V8 hand
// a regex that backtracks too much to its linear engine, which takes no pattern read with `u`:
// a pattern that does not need it goes without it.

/**
 * A copy of the schema the checker can read in time: every schema that holds a pattern states
 * the flags it is read with, and a pattern no engine answers in time for every text is left
 * out. The checker reads `regexFlags` beside the pattern, so the choice is the app's: a schema
 * that writes its own (`g` keeps where the last test stopped) has it replaced.
 */
export function withPatternFlags(schema: unknown): unknown {
    const copy: unknown = structuredClone(schema);

    for (const { schema: spot } of allSpotsOf(copy)) {
        if (typeof spot['pattern'] === 'string' && uncheckedPattern(spot['pattern'])) {
            delete spot['pattern'];
        }

        const patterns = patternsOf(spot);

        if (patterns.length > 0) {
            spot['regexFlags'] = patterns.some((each) => NEEDS_UNICODE.test(each)) ? 'u' : '';
        }
    }

    return copy;
}

/** The patterns one schema reads values or property names with. */
function patternsOf(schema: Record<string, unknown>): string[] {
    const pattern = schema['pattern'];
    const named = schema['patternProperties'];
    const names = isRecord(named) ? Object.keys(named) : [];

    return typeof pattern === 'string' ? [pattern, ...names] : names;
}
