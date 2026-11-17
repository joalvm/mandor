import type { SchemaNode } from 'json-schema-library';

import type { SchemaPlaces } from '../schema-places/schema-places.js';

/**
 * One schema read and ready to check values. What leaves the package stays opaque: callers see
 * only the text the schema was written with, and the read schema is kept beside the box.
 *
 * The package never evaluates generated code: the renderer it runs in forbids it, and a
 * checker that needs `eval` is a checker the interface cannot have. The checker below walks
 * the schema as data.
 */
export type CompiledSchema = {
    /** The schema text it was read from, exactly as somebody wrote it. */
    readonly source: string;
};

/** What stands behind a box: the checker's node, and where each part of the schema sits. */
export type ReadSchema = {
    readonly node: SchemaNode;
    readonly places: SchemaPlaces;
};

/** The read schema behind each box. It is not part of the type callers see. */
const SCHEMAS = new WeakMap<CompiledSchema, ReadSchema>();

export function compiledSchema(source: string, read: ReadSchema): CompiledSchema {
    const compiled = { source };

    SCHEMAS.set(compiled, read);

    return compiled;
}

/** The schema behind the opaque box, for the checker that walks it. */
export function schemaOf(compiled: CompiledSchema): ReadSchema | undefined {
    return SCHEMAS.get(compiled);
}
