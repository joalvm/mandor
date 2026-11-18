import { useEffect, useSyncExternalStore } from 'react';

import {
    loadEditorRuntime,
    loadedEditorRuntime,
    onEditorRuntimeLoaded,
    type EditorRuntime,
} from '../editor/editor-runtime.js';

/** The editor once it has loaded, and nothing before. Asking for it is what loads it. */
export function useEditorRuntime(): EditorRuntime | null {
    const runtime = useSyncExternalStore(onEditorRuntimeLoaded, loadedEditorRuntime);

    // An editor that fails to load is a fault of the build, not of the view: it is told where
    // every uncaught fault of the window is, and the view stays empty rather than half drawn.
    useEffect(() => {
        void loadEditorRuntime().catch((error: unknown) => {
            reportError(error);
        });
    }, []);

    return runtime;
}
