import type * as MarkdownTreeModule from './MarkdownTree.js';

/** What turns markdown into a tree, loaded apart from the window that shows it. */
export type MarkdownRuntime = typeof MarkdownTreeModule;

type Listener = () => void;

const state: { loaded: MarkdownRuntime | null; loading: Promise<MarkdownRuntime> | null } = {
    loaded: null,
    loading: null,
};

const listeners = new Set<Listener>();

/**
 * Loads the parser, its GFM extensions and the highlighter the first time markdown is drawn.
 * Together they weigh as much as the rest of the window, and a window that shows no doc and no
 * description does not wait for them to open.
 */
export function loadMarkdownRuntime(): Promise<MarkdownRuntime> {
    state.loading ??= import('./MarkdownTree.js').then((runtime) => {
        state.loaded = runtime;
        listeners.forEach((listener) => {
            listener();
        });

        return runtime;
    });

    return state.loading;
}

/** The renderer of markdown, once it has loaded; nothing before. */
export function loadedMarkdownRuntime(): MarkdownRuntime | null {
    return state.loaded;
}

/** Hears the renderer of markdown arrive, once. */
export function onMarkdownRuntimeLoaded(listener: Listener): () => void {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}
