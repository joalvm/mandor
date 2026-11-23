import './monaco-setup.js';

import { editor, type IDisposable } from 'monaco-editor/editor/editor.api.js';
import type { TextRange } from '@mandor/validate';

import { diagnosticsOf } from '../diagnostics-of.js';
import { isReadOnly, type EditorOptions } from '../editor-options.js';
import { measureCodeTypeOnArrival } from './code-type-arrival.js';
import { constructionOptions, type EditorSetup } from './construction-options.js';
import { lintModel } from './editor-markers.js';
import { suggestModel } from './editor-suggestions.js';
import { followTextZoom } from './follow-text-zoom.js';
import { ghostModel } from './ghost-text.js';
import { overwriteText, replaceText } from './model-text.js';
import { routeNativeEdits } from './native-edits.js';
import { runCommand, type EditorCommandId } from './run-command.js';
import { declareScript } from './script-language.js';
import { releaseModel, retainModel, type EditorDocument } from './shared-models.js';
import { paintVariables } from './variable-decorations.js';

/** Where an editor stands: how it is set up, and the document it shows, by key and first text. */
export type EditorTarget = EditorSetup & { modelKey: string; value: string };

/**
 * How much the view shows of the text and where it stands in it, in pixels: what the text would
 * take whole, the part of it in view, and how far it is scrolled along each axis.
 */
export type EditorView = {
    height: number;
    scrollHeight: number;
    scrollLeft: number;
    scrollTop: number;
    scrollWidth: number;
    width: number;
};

/** One editor on the page, for whoever mounted it to talk to. */
export type MountedEditor = {
    dispose: () => void;
    getValue: () => string;
    run: (id: EditorCommandId) => Promise<boolean>;
    /** Selects a stretch of the text, brings it into view and takes the caret there. */
    select: (range: TextRange) => void;
    setValue: (next: string) => void;
    /** Puts a line of the document at the top of the view, wherever the view was. */
    showLine: (line: number) => void;
    /** The line the view opens on, which is what another view of the same text has to match. */
    topLine: () => number;
    update: (next: EditorTarget) => void;
    view: () => EditorView;
    /** Says when the view moved, whoever moved it, and hands back the way to stop listening. */
    watchScroll: (listener: () => void) => () => void;
};

type Mounted = { applied: EditorTarget; extras: IDisposable[]; model: editor.ITextModel };

function documentOf(target: EditorTarget): EditorDocument {
    return { key: target.modelKey, language: target.language, value: target.value };
}

/** What the options add over the text: declarations, marks, suggestions, ghost text and variable tones. */
function extrasOf(
    shown: editor.ICodeEditor,
    model: editor.ITextModel,
    target: EditorTarget,
): IDisposable[] {
    const checks = diagnosticsOf(target.language, target.options);
    const { declarations, ghostText, suggest, variables } = target.options;

    return [
        ...(declarations === undefined ? [] : [declareScript(model, declarations)]),
        ...(checks === null ? [] : [lintModel(model, checks)]),
        ...(suggest === undefined ? [] : [suggestModel(model, suggest)]),
        ...(ghostText === undefined ? [] : [ghostModel(model, ghostText)]),
        ...(variables === undefined ? [] : [paintVariables(shown, variables)]),
    ];
}

/** Options written inline arrive as a new object on every render: what they say is what counts. */
function sameOptions(applied: EditorOptions, next: EditorOptions): boolean {
    const keys = new Set([...Object.keys(applied), ...Object.keys(next)]) as Set<
        keyof EditorOptions
    >;

    return [...keys].every((key) => applied[key] === next[key]);
}

function sameSetup(applied: EditorTarget, next: EditorTarget): boolean {
    return (
        applied.modelKey === next.modelKey &&
        applied.language === next.language &&
        applied.ariaLabel === next.ariaLabel &&
        sameOptions(applied.options, next.options)
    );
}

/** The document of the new setup: another key is another document, and the old one is let go. */
function documentFor(
    shown: editor.ICodeEditor,
    mounted: Mounted,
    next: EditorTarget,
): editor.ITextModel {
    if (next.modelKey === mounted.applied.modelKey) {
        editor.setModelLanguage(mounted.model, next.language);

        return mounted.model;
    }

    const model = retainModel(documentOf(next));

    shown.setModel(model);
    releaseModel(mounted.applied.modelKey);

    return model;
}

function disposeAll(disposables: readonly IDisposable[]): void {
    disposables.forEach((disposable) => {
        disposable.dispose();
    });
}

/**
 * Builds one editor nobody sees and lets it go. The first editor of a window starts the services
 * every later one shares and measures the code type they all write in; built here, out of sight,
 * the first document the user opens finds all of it done.
 */
export function warmEditor(): void {
    const setup = constructionOptions({ ariaLabel: '', language: 'jsonc', options: {} });

    // A document in the language most of them are written in: its grammar is compiled the
    // first time a document of it is opened, and here that is nobody's.
    const model = editor.createModel('{}', 'jsonc');

    editor.create(document.createElement('div'), { ...setup, model }).dispose();
    model.dispose();
}

/**
 * One step of the history over the editor that holds the focus, and whether there was one to
 * take it. The Edit menu of the window runs the browser's undo over the field the caret sits
 * in, which holds a few lines of the document and none of the steps that wrote them: the
 * history is the document's, and the document is here.
 */
export function stepFocusedEditor(step: 'redo' | 'undo'): boolean {
    const model = editor
        .getEditors()
        .find((each) => each.hasTextFocus())
        ?.getModel();

    if (model === null || model === undefined) {
        return false;
    }

    // The step is the name of the document's own method.
    void model[step]();

    return true;
}

/** Selects `[from, to)` of the model, in the middle of the view when it was out of it. */
function selectRange(
    shown: editor.IStandaloneCodeEditor,
    model: editor.ITextModel,
    range: TextRange,
) {
    const start = model.getPositionAt(range.from);
    const end = model.getPositionAt(range.to);
    const selection = {
        endColumn: end.column,
        endLineNumber: end.lineNumber,
        startColumn: start.column,
        startLineNumber: start.lineNumber,
    };

    shown.setSelection(selection);
    shown.revealRangeInCenterIfOutsideViewport(selection);
    shown.focus();
}

/**
 * Mounts one editor in an element. Every change of its text is handed out, whoever made it:
 * two views of one document both hear what is typed in either, and both hold the same text.
 */
export function mountEditor(
    element: HTMLElement,
    target: EditorTarget,
    onChange: (value: string) => void,
): MountedEditor {
    measureCodeTypeOnArrival();

    const model = retainModel(documentOf(target));
    const shown = editor.create(element, { ...constructionOptions(target), model });
    const mounted: Mounted = { applied: target, extras: extrasOf(shown, model, target), model };
    const listeners = [
        routeNativeEdits(shown),
        followTextZoom(shown, element),
        shown.onDidChangeModelContent(() => {
            onChange(shown.getValue());
        }),
    ];

    if (target.options.focusOnMount === true) {
        shown.focus();
    }

    return {
        dispose: () => {
            disposeAll([...mounted.extras, ...listeners]);
            shown.dispose();
            releaseModel(mounted.applied.modelKey);
        },
        getValue: () => mounted.model.getValue(),
        run: (id) => runCommand(shown, id),
        select: (range) => {
            selectRange(shown, mounted.model, range);
        },
        setValue: (next) => {
            const { language, options } = mounted.applied;
            const write = isReadOnly(language, options) ? overwriteText : replaceText;

            write(mounted.model, next);
        },
        showLine: (line) => {
            shown.setScrollTop(shown.getTopForLineNumber(line));
        },
        topLine: () => shown.getVisibleRanges()[0]?.startLineNumber ?? 1,
        update: (next) => {
            if (sameSetup(mounted.applied, next)) {
                return;
            }

            disposeAll(mounted.extras);
            mounted.model = documentFor(shown, mounted, next);
            shown.updateOptions(constructionOptions(next));
            mounted.applied = next;
            mounted.extras = extrasOf(shown, mounted.model, next);
        },
        view: () => {
            const layout = shown.getLayoutInfo();

            return {
                height: layout.height,
                scrollHeight: shown.getScrollHeight(),
                scrollLeft: shown.getScrollLeft(),
                scrollTop: shown.getScrollTop(),
                scrollWidth: shown.getScrollWidth(),
                width: layout.contentWidth,
            };
        },
        watchScroll: (listener) => {
            const heard = shown.onDidScrollChange(() => {
                listener();
            });

            return () => {
                heard.dispose();
            };
        },
    };
}
