import { parse, type ParseError } from 'jsonc-parser';

import { schemaFromValue } from '../schema-from-value/schema-from-value.js';
import { keepingStrictness } from '../schema-strictness/keeping-strictness.js';

/** How much the schema on file says beyond what the body already tells on its own. */
export type SchemaTriviality = 'empty' | 'asGenerated' | 'hasMore';

/**
 * JSON data with the keys of every object in one order, so two data of one shape write one text.
 * The schema on file keeps the order someone wrote, the generated one the order of the body:
 * what counts is the shape they name, never the order of its keys.
 */
function canonical(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(canonical);
    }

    if (typeof value !== 'object' || value === null) {
        return value;
    }

    return Object.fromEntries(
        Object.entries(value)
            .sort(([one], [other]) => one.localeCompare(other))
            .map(([key, each]) => [key, canonical(each)]),
    );
}

function sameData(one: unknown, other: unknown): boolean {
    return JSON.stringify(canonical(one)) === JSON.stringify(canonical(other));
}

/**
 * What generating from the body would do to the schema on file: nothing (`empty`), exactly what
 * is already there (`asGenerated`), or lose work someone wrote by hand or imported
 * (`hasMore`). The generation keeps the options the schema holds, so an option is not work
 * lost. The decision is derived every time — nothing about the schema is remembered,
 * because the schema itself is what remembers.
 *
 * The schema is read as JSONC, the way every schema in the app is written. A body the parser
 * cannot read generates nothing, and lands here as `hasMore` so nobody is ever asked about a
 * replacement that would not happen: whoever mounts the generation checks that first.
 */
export function schemaTriviality(payload: string, schema: string): SchemaTriviality {
    if (schema.trim() === '') {
        return 'empty';
    }

    const errors: ParseError[] = [];
    const current: unknown = parse(schema, errors, { allowTrailingComma: true });

    if (errors.length > 0 || current === undefined) {
        return 'hasMore';
    }

    let generated: string;

    try {
        generated = keepingStrictness(schema, schemaFromValue(JSON.parse(payload)));
    } catch {
        return 'hasMore';
    }

    return sameData(current, JSON.parse(generated)) ? 'asGenerated' : 'hasMore';
}
