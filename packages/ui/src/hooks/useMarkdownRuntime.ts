import { useEffect, useSyncExternalStore } from 'react';

import {
    loadMarkdownRuntime,
    loadedMarkdownRuntime,
    onMarkdownRuntimeLoaded,
    type MarkdownRuntime,
} from '../components/markdown/markdown-runtime.js';

/** The renderer of markdown once it has loaded, and nothing before. Asking for it loads it. */
export function useMarkdownRuntime(): MarkdownRuntime | null {
    const runtime = useSyncExternalStore(onMarkdownRuntimeLoaded, loadedMarkdownRuntime);

    // A renderer that fails to load is a fault of the build, not of the text: it is told where
    // every uncaught fault of the window is, and the text stays undrawn rather than half drawn.
    useEffect(() => {
        void loadMarkdownRuntime().catch((error: unknown) => {
            reportError(error);
        });
    }, []);

    return runtime;
}
