import type * as Monaco from 'monaco-editor/editor/editor.api.js';
import { act } from 'react';

import {
    loadedEditorRuntime,
    loadEditorRuntime,
    pendingEditorRuntime,
} from '../editor/editor-runtime.js';
import { setTextZoom } from '../lib/text-zoom.js';

/** One editor of the page, read and typed into the way a test needs, and nothing more. */
export type TestEditor = {
    /** How large the text is drawn, in pixels, which the reader of the window gets to change. */
    fontSize: () => number;
    language: () => string;
    /** Whether it marks a bidi or a space of no width, in comments and strings too. */
    marksHidden: () => boolean;
    /** The messages of what the editor marks wrong in its text. */
    marks: () => readonly string[];
    /** Whether the margin counts the lines of the text. */
    numbered: () => boolean;
    readOnly: () => boolean;
    /** The text the selection covers, and nothing while the caret only stands somewhere. */
    selected: () => string;
    text: () => string;
    /** The tone of every variable painted in the text, in the order they are written. */
    tones: () => readonly string[];
    /** Replaces the whole text the way typing does, and so types nothing into a text that is only read. */
    typeOver: (text: string) => void;
    /** Whether a line too long for the box folds instead of running off the side of it. */
    wraps: () => boolean;
};

type Shown = Monaco.editor.ICodeEditor;

const TONE = /mandor-variable-(\w+)/;

function tonesOf(api: typeof Monaco, shown: Shown): readonly string[] {
    const model = shown.getModel();
    const painted = model === null ? null : shown.getDecorationsInRange(model.getFullModelRange());

    return [...(painted ?? [])]
        .sort((first, second) => api.Range.compareRangesUsingStarts(first.range, second.range))
        .flatMap(
            (decoration) => TONE.exec(decoration.options.inlineClassName ?? '')?.slice(1, 2) ?? [],
        );
}

function marksOf(api: typeof Monaco, shown: Shown): readonly string[] {
    const model = shown.getModel();

    return model === null
        ? []
        : api.editor.getModelMarkers({ resource: model.uri }).map((mark) => mark.message);
}

function typeOver(shown: Shown, text: string): void {
    act(() => {
        const model = shown.getModel();

        if (model !== null) {
            shown.setSelection(model.getFullModelRange());
        }

        // Typed as one piece: key by key, the editor would close every bracket it opens. An
        // empty piece types nothing, so the selection goes the way Backspace takes it.
        shown.trigger('test', text === '' ? 'deleteLeft' : 'type', { text });
    });
}

function testEditorOf(api: typeof Monaco, shown: Shown): TestEditor {
    return {
        fontSize: () => shown.getOption(api.editor.EditorOption.fontSize),
        language: () => shown.getModel()?.getLanguageId() ?? '',
        marks: () => marksOf(api, shown),
        marksHidden: () => {
            const marking = shown.getOption(api.editor.EditorOption.unicodeHighlighting);

            return (
                marking.invisibleCharacters &&
                marking.includeComments === true &&
                marking.includeStrings === true
            );
        },
        numbered: () =>
            shown.getOption(api.editor.EditorOption.lineNumbers).renderType !==
            api.editor.RenderLineNumbersType.Off,
        readOnly: () => shown.getOption(api.editor.EditorOption.readOnly),
        selected: () => {
            const selection = shown.getSelection();

            return selection === null ? '' : (shown.getModel()?.getValueInRange(selection) ?? '');
        },
        text: () => shown.getValue(),
        tones: () => tonesOf(api, shown),
        typeOver: (text) => {
            typeOver(shown, text);
        },
        wraps: () => shown.getOption(api.editor.EditorOption.wordWrap) === 'on',
    };
}

function drawingOrder(first: Shown, second: Shown): number {
    const position = first
        .getContainerDomNode()
        .compareDocumentPosition(second.getContainerDomNode());

    return (position & Node.DOCUMENT_POSITION_FOLLOWING) === 0 ? 1 : -1;
}

/**
 * The editors the document has mounted, in the order they are drawn. The editor loads apart,
 * the first time one is drawn, so this waits for it the way the window does. They are the real
 * ones: the editor mounts under jsdom, so there is no double to keep in step with it.
 */
export async function editorsIn(root: ParentNode = document): Promise<TestEditor[]> {
    await act(async () => {
        await loadEditorRuntime();
    });

    const api = await import('monaco-editor/editor/editor.api.js');

    return api.editor
        .getEditors()
        .filter((shown) => root.contains(shown.getContainerDomNode()))
        .sort(drawingOrder)
        .map((shown) => testEditorOf(api, shown));
}

/** The editor in one position of the drawing order, or a failure that names the position. */
export async function editorAt(index: number, root: ParentNode = document): Promise<TestEditor> {
    const shown = (await editorsIn(root))[index];

    if (shown === undefined) {
        throw new Error(`no editor is mounted in position ${String(index)}`);
    }

    return shown;
}

/**
 * Loads the editor before any test draws one. Where the files of a worker share their modules,
 * whether it is still loading when a test draws one depends on the file that ran before; loaded
 * up front, every editor a test draws mounts at once, whatever ran before it.
 */
export async function preloadEditorRuntime(): Promise<void> {
    await loadEditorRuntime();
}

/**
 * What a test left of the editor once its window is gone: the editors still mounted and the
 * documents still open. Either one outlives the test that drew it, renders into the next one and
 * hands it the text of this one. Nothing to find while the editor has not loaded.
 */
export async function strayEditors(): Promise<{ editors: number; models: number }> {
    if (loadedEditorRuntime() === null) {
        return { editors: 0, models: 0 };
    }

    const api = await import('monaco-editor/editor/editor.api.js');

    return { editors: api.editor.getEditors().length, models: api.editor.getModels().length };
}

/**
 * Waits, inside act, for an editor that is still loading. A test that draws one and never looks
 * at it would otherwise see it land in the next test, or after its window is gone.
 */
export async function settleEditorRuntime(): Promise<void> {
    const pending = pendingEditorRuntime();

    if (pending === null) {
        return;
    }

    await act(async () => {
        await pending;
    });
}

/**
 * The text of the window back at the size of the app. The step is the window's and lives in a
 * module, and the files of a worker share their modules: each file starts at the size a fresh
 * window opens at, whatever step the file before left it at.
 */
export function forgetTextZoom(): void {
    setTextZoom(0);
}
