import type { editor, IDisposable } from 'monaco-editor/editor/editor.api.js';

import { watchCodePreferences } from '../code-preferences.js';

/**
 * Keeps one editor writing the way the person set the editors to write: a change of the settings
 * rewrites the editors already open, not only the next to open. `optionsOf` reads what the editor
 * stands on at the moment of the change, which may not be what it was built on.
 */
export function followCodePreferences(
    shown: Pick<editor.IEditor, 'updateOptions'>,
    optionsOf: () => editor.IEditorOptions,
): IDisposable {
    return {
        dispose: watchCodePreferences(() => {
            shown.updateOptions(optionsOf());
        }),
    };
}
