import { loadMarkdownRuntime } from '../components/markdown/markdown-runtime.js';

/**
 * Loads the renderer of markdown before any test draws some. Where the files of a worker share
 * their modules, whether it is still loading when a test draws markdown depends on the file that
 * ran before; loaded up front, every text a test draws is there in its first render.
 */
export async function preloadMarkdownRuntime(): Promise<void> {
    await loadMarkdownRuntime();
}
