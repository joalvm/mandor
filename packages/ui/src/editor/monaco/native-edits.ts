import type { editor, IDisposable } from 'monaco-editor/editor/editor.api.js';

/** The history commands the browser sends to the focused input, as steps of the document's own history. */
const HISTORY: Partial<Record<string, (model: editor.ITextModel) => void>> = {
    historyRedo: (model) => {
        void model.redo();
    },
    historyUndo: (model) => {
        void model.undo();
    },
};

/**
 * The Edit menu of the window runs the browser's own commands on whatever input has the focus.
 * The input of an editor holds a few lines around the cursor and none of the document's history,
 * so undo, redo and select all from the menu are answered here, over the document, and the
 * browser's version of them is called off. Whatever else the editor holds — its search field —
 * keeps the browser's. Typed shortcuts never get this far: the editor answers them first.
 *
 * The page hears them first, not the editor: the browser aims its undo at the field whose
 * history it holds, which may be another one, and its select all at the page when it sees no
 * selection. While the editor holds the focus, both are the editor's, wherever they were aimed.
 */
export function routeNativeEdits(shown: editor.ICodeEditor): IDisposable {
    const page = shown.getDomNode()?.ownerDocument ?? document;
    const onBeforeInput = (event: InputEvent): void => {
        const step = HISTORY[event.inputType];
        const model = shown.getModel();

        if (step === undefined || model === null || !shown.hasTextFocus()) {
            return;
        }

        event.preventDefault();
        step(model);
    };

    const onSelectStart = (event: Event): void => {
        const model = shown.getModel();

        if (model === null || !shown.hasTextFocus()) {
            return;
        }

        event.preventDefault();
        shown.setSelection(model.getFullModelRange());
    };

    page.addEventListener('beforeinput', onBeforeInput, true);
    page.addEventListener('selectstart', onSelectStart, true);

    return {
        dispose: () => {
            page.removeEventListener('beforeinput', onBeforeInput, true);
            page.removeEventListener('selectstart', onSelectStart, true);
        },
    };
}
