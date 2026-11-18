import type * as CheckerLibrary from './checker-library.js';

/** What reads a schema and checks values against it, loaded apart from what asks. */
type SchemaChecker = typeof CheckerLibrary;

type Listener = () => void;

const state: { loaded: SchemaChecker | null; loading: Promise<SchemaChecker> | null } = {
    loaded: null,
    loading: null,
};

const listeners = new Set<Listener>();

/**
 * Loads the checker the first time a schema is read. It weighs a seventh of the window and
 * holds two megabytes once evaluated, and a window that opens no schema does not pay for it to
 * open: the window loads it later, when it has nothing else to do.
 */
export function loadSchemaChecker(): Promise<SchemaChecker> {
    state.loading ??= import('./checker-library.js').then((checker) => {
        state.loaded = checker;
        listeners.forEach((listener) => {
            listener();
        });

        return checker;
    });

    return state.loading;
}

/** The checker, once it has loaded; nothing before. */
export function loadedSchemaChecker(): SchemaChecker | null {
    return state.loaded;
}

/** Hears the checker arrive, once. */
export function onSchemaCheckerLoaded(listener: Listener): () => void {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}

/**
 * Runs what needs a verdict now when the checker is there, and the moment it arrives when it is
 * not. A send guarded by its schema waits for the answer instead of going out unchecked.
 */
export function withSchemaChecker(run: () => void): void {
    if (state.loaded !== null) {
        run();

        return;
    }

    void loadSchemaChecker().then(() => {
        run();
    });
}
