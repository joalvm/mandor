import { parse, printParseErrorCode, type ParseError } from 'jsonc-parser';

import { compiledSchema, type CompiledSchema } from '../compiled-schema/compiled-schema.js';
import { schemaPlacesOf } from '../schema-places/schema-places.js';
import { loadedSchemaChecker, loadSchemaChecker } from '../schema-checker/schema-checker.js';

import { withPatternFlags } from './pattern-flags.js';

/**
 * What reading a schema text ends in: either a schema ready to check values, or why the text
 * cannot be one. A schema written by hand breaks by being written, and breaking is an answer,
 * not a crash. A text read before the checker has loaded is waiting: no verdict yet, either way.
 */
export type CompileSchemaResult =
    | { ok: true; schema: CompiledSchema }
    | { ok: false; message: string }
    | { ok: false; waiting: true };

// Every keystroke of the editor re-asks for the same text; the cache keeps the read to the
// first one per text, and the ceiling keeps a long session from holding every draft forever.
const CACHE_LIMIT = 32;
const cache = new Map<string, CompiledSchema>();

const WAITING = { ok: false, waiting: true } as const;

export function compileSchema(source: string): CompileSchemaResult {
    const kept = recalled(source);

    if (kept !== undefined) {
        return { ok: true, schema: kept };
    }

    const errors: ParseError[] = [];
    // Read as the draw of a value reads it: comments and a trailing comma are part of a schema
    // written by hand, and a text one side takes the other must not call broken.
    const parsed: unknown = parse(source, errors, { allowTrailingComma: true });
    const broken = errors[0];

    if (broken !== undefined) {
        return { ok: false, message: messageOf(broken) };
    }

    const checker = loadedSchemaChecker();

    // A schema read before the checker loads is not yet answered, neither kept nor refused: the
    // read asks for the checker, and whoever asked hears it arrive and reads again.
    if (checker === null) {
        void loadSchemaChecker();

        return WAITING;
    }

    // The checker names the part that refused by the object itself: the places are found in the
    // same copy the node is built from, or two parts written alike take each other's place.
    const flagged = withPatternFlags(parsed);
    const node = checker.nodeOf(flagged);

    if (typeof node === 'string') {
        return { ok: false, message: node };
    }

    const schema = compiledSchema(source, { node, places: schemaPlacesOf(flagged) });

    remember(source, schema);

    return { ok: true, schema };
}

/** The schema read before from the same text, made the newest of the cache again. */
function recalled(source: string): CompiledSchema | undefined {
    const kept = cache.get(source);

    if (kept !== undefined) {
        cache.delete(source);
        cache.set(source, kept);
    }

    return kept;
}

function remember(source: string, schema: CompiledSchema): void {
    const oldest = cache.keys().next();

    if (cache.size >= CACHE_LIMIT && oldest.done !== true) {
        cache.delete(oldest.value);
    }

    cache.set(source, schema);
}

function messageOf(broken: ParseError): string {
    return `the schema is not JSON: ${printParseErrorCode(broken.error)} at offset ${String(broken.offset)}`;
}
