import type { editor, IDisposable } from 'monaco-editor/editor/editor.api.js';

import { watchTextZoom } from '../../lib/text-zoom.js';
import { listenForTextZoom } from '../../lib/text-zoom-input.js';
import { codeSize } from './construction-options.js';

/**
 * Keeps the type of one editor at the size the reader chose for the window, and lets the reader
 * choose it from over the editor itself. The editor is built at that size already: from then on it
 * only hears the changes, whichever editor or page of the window they were made over.
 */
export function followTextZoom(shown: editor.IEditor, element: HTMLElement): IDisposable {
    const stopWatching = watchTextZoom(() => {
        shown.updateOptions(codeSize());
    });
    const stopListening = listenForTextZoom(element);

    return {
        dispose: () => {
            stopWatching();
            stopListening();
        },
    };
}
