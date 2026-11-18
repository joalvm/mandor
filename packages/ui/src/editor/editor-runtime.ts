import { loadEditorMessages } from './editor-messages.js';
import { CODE_TYPE } from './monaco/construction-options.js';

import type * as MountDiffEditor from './monaco/mount-diff-editor.js';
import type * as MountEditor from './monaco/mount-editor.js';

/** The editor itself: what mounts one, loaded apart from the window that shows it. */
export type EditorRuntime = typeof MountEditor & typeof MountDiffEditor;

type Listener = () => void;

const state: { loaded: EditorRuntime | null; loading: Promise<EditorRuntime> | null } = {
    loaded: null,
    loading: null,
};

const listeners = new Set<Listener>();

/**
 * The code type, in. Monaco measures it at the first editor and keeps the reading for the window,
 * so no editor is built before it lands. A type that never lands is a fault of the build: the
 * editor opens anyway, and a face that lands later has it measure again.
 */
function codeTypeLoaded(): Promise<void> {
    return document.fonts.load(CODE_TYPE).then(
        () => undefined,
        (error: unknown) => {
            reportError(error);
        },
    );
}

/**
 * Loads the editor the first time one is asked for. It weighs more than the rest of the window
 * together, and a window that shows none, or shows one later, does not wait for it to open. Its
 * messages go first: the editor reads them as it is evaluated, so afterwards would be too late.
 * It counts as loaded once its type is in too, so every editor measures the letters it draws.
 */
export function loadEditorRuntime(): Promise<EditorRuntime> {
    state.loading ??= loadEditorMessages()
        .then(() =>
            Promise.all([
                import('./monaco/mount-editor.js'),
                import('./monaco/mount-diff-editor.js'),
            ]),
        )
        .then((modules) => codeTypeLoaded().then(() => modules))
        .then(([editors, diffs]) => {
            const runtime: EditorRuntime = { ...editors, ...diffs };

            state.loaded = runtime;
            listeners.forEach((listener) => {
                listener();
            });

            return runtime;
        });

    return state.loading;
}

/** The editor, once it has loaded; nothing before. */
export function loadedEditorRuntime(): EditorRuntime | null {
    return state.loaded;
}

/** The load under way or done, or nothing while no editor has been asked for. */
export function pendingEditorRuntime(): Promise<EditorRuntime> | null {
    return state.loading;
}

/** Hears the editor arrive, once. */
export function onEditorRuntimeLoaded(listener: Listener): () => void {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}
