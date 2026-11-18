import type { schemaToValue } from './schema-to-value.js';

/** What writes the body a schema asks for, loaded apart from what asks. */
type SchemaToValue = typeof schemaToValue;

const state: { loaded: SchemaToValue | null; loading: Promise<SchemaToValue> | null } = {
    loaded: null,
    loading: null,
};

/**
 * Loads the generator the first time a body is generated. Only a click on generate needs it,
 * and a window that never generates does not pay to parse and hold it while it opens.
 */
export function loadSchemaToValue(): Promise<SchemaToValue> {
    state.loading ??= import('./schema-to-value.js').then((module) => {
        state.loaded = module.schemaToValue;

        return module.schemaToValue;
    });

    return state.loading;
}

/** Runs a generation now when the generator is there, and the moment it arrives when it is not. */
export function withSchemaToValue(run: (generate: SchemaToValue) => void): void {
    if (state.loaded !== null) {
        run(state.loaded);

        return;
    }

    void loadSchemaToValue().then(run);
}
