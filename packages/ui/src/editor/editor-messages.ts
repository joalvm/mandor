/**
 * The languages the editor can be read in: the ones this app speaks and Monaco ships a bundle
 * for. English is not one of them — it is written into the editor's own source, and loading a
 * bundle to say the same words again is a third of a megabyte for nothing.
 */
const BUNDLES: Readonly<Record<string, () => Promise<unknown>>> = {
    es: () => import('monaco-editor/nls/lang/es.js'),
};

/**
 * The messages the editor shows — its find widget, its context actions, what it announces — in
 * the language the window says it is read in. The bundle writes them into globals the editor
 * reads as it is evaluated, so this is awaited before the editor itself is imported, and a
 * language chosen afterwards reaches the editor when the window next opens.
 */
export async function loadEditorMessages(): Promise<void> {
    const load = BUNDLES[document.documentElement.lang];

    if (load === undefined) {
        return;
    }

    await load();
}
