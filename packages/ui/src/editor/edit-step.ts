import { loadedEditorRuntime } from './editor-runtime.js';

/**
 * One step of the history over whatever the caret sits in. The editor keeps the history of its
 * document and the browser keeps one per field, so the step goes to the editor when it holds the
 * focus and to the browser otherwise: a window with no editor open still undoes what was typed
 * in its fields.
 */
export function applyEditStep(step: 'redo' | 'undo'): void {
    if (loadedEditorRuntime()?.stepFocusedEditor(step) === true) {
        return;
    }

    // Deprecated and still the only way to reach the history a field keeps: the accelerator
    // that would have run it belongs to the menu now, so nobody else is going to.
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    document.execCommand(step);
}
