import type * as Monaco from 'monaco-editor/editor/editor.api.js';
import { act } from 'react';

import { loadEditorRuntime } from '../editor/editor-runtime.js';

/** One diff of the page, read and typed into the way a test needs, and nothing more. */
export type TestDiffEditor = {
    /** How many blocks of lines differ, or `null` while the comparison is still being made. */
    changes: () => number | null;
    language: () => string;
    modified: () => string;
    original: () => string;
    /** Whether the right pane refuses to be written. The left one always does. */
    readOnly: () => boolean;
    /** Replaces the whole text of the right pane the way typing does. */
    typeOver: (text: string) => void;
};

type Shown = Monaco.editor.IDiffEditor;

function typeOver(shown: Shown, text: string): void {
    act(() => {
        const pane = shown.getModifiedEditor();
        const model = pane.getModel();

        if (model !== null) {
            pane.setSelection(model.getFullModelRange());
        }

        // Typed as one piece: key by key, the editor would close every bracket it opens.
        pane.trigger('test', 'type', { text });
    });
}

function testDiffEditorOf(api: typeof Monaco, shown: Shown): TestDiffEditor {
    return {
        changes: () => shown.getLineChanges()?.length ?? null,
        language: () => shown.getModifiedEditor().getModel()?.getLanguageId() ?? '',
        modified: () => shown.getModifiedEditor().getValue(),
        original: () => shown.getOriginalEditor().getValue(),
        readOnly: () => shown.getModifiedEditor().getOption(api.editor.EditorOption.readOnly),
        typeOver: (text) => {
            typeOver(shown, text);
        },
    };
}

/**
 * The diffs the document has mounted, in the order they are drawn. The editor loads apart, so
 * this waits for it the way the window does; they are the real ones, under jsdom.
 */
async function diffEditorsIn(root: ParentNode = document): Promise<TestDiffEditor[]> {
    await act(async () => {
        await loadEditorRuntime();
    });

    const api = await import('monaco-editor/editor/editor.api.js');

    return api.editor
        .getDiffEditors()
        .filter((shown) => root.contains(shown.getContainerDomNode()))
        .map((shown) => testDiffEditorOf(api, shown));
}

/** The diff in one position of the drawing order, or a failure that names the position. */
export async function diffEditorAt(
    index: number,
    root: ParentNode = document,
): Promise<TestDiffEditor> {
    const shown = (await diffEditorsIn(root))[index];

    if (shown === undefined) {
        throw new Error(`no diff is mounted in position ${String(index)}`);
    }

    return shown;
}
