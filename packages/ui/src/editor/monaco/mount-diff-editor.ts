import './monaco-setup.js';

import { editor } from 'monaco-editor/editor/editor.api.js';

import type { EditorLanguage } from '../editor-language.js';
import { measureCodeTypeOnArrival } from './code-type-arrival.js';
import { constructionOptions } from './construction-options.js';
import { followCodePreferences } from './follow-code-preferences.js';
import { followTextZoom } from './follow-text-zoom.js';
import { overwriteText, replaceText } from './model-text.js';

/** What a diff stands on: the two texts, their language, and what the two panes are called. */
export type DiffTarget = {
    /** Keeps the two panes one above the other, whatever room the diff has. */
    inline?: boolean | undefined;
    language: EditorLanguage;
    /** Whether the lines are numbered; they are when it is not said. */
    lineNumbers?: 'off' | 'on' | undefined;
    /** The pane on the right, which is the result: the one that can be written. */
    modified: string;
    modifiedLabel: string;
    /** The pane on the left, which is only read. */
    original: string;
    originalLabel: string;
    readOnly: boolean;
    /** Whether long lines wrap in both panes; they scroll sideways when it is not said. */
    wrap?: boolean | undefined;
};

/** One diff on the page, for whoever mounted it to talk to. */
export type MountedDiffEditor = {
    dispose: () => void;
    getModified: () => string;
    update: (next: DiffTarget) => void;
};

/**
 * The diff Monaco ships, but for what a conflict needs: the left pane is never written, and a
 * change of spacing is a change, since it is what the result will hold.
 */
const DIFF: editor.IDiffEditorConstructionOptions = {
    ignoreTrimWhitespace: false,
    // The comparison runs on the thread that draws (`main-thread-diff.ts`). A real change of
    // fifty thousand lines takes a tenth of a second; two texts that share nothing took the
    // default five seconds, frozen, and past the budget the diff marks the whole block instead.
    maxComputationTime: 500,
    originalEditable: false,
};

/** A pane that is read offers no actions on its code, so the bulb of the margin never shows. */
const NO_BULB: editor.IEditorLightbulbOptions = { enabled: editor.ShowLightbulbIconMode.Off };

/** What the diff is built with, and changed with when its caller asks otherwise. */
export function diffOptionsOf(target: DiffTarget): editor.IDiffEditorConstructionOptions {
    return {
        ...constructionOptions({
            ariaLabel: target.modifiedLabel,
            language: target.language,
            options: {
                lineNumbers: target.lineNumbers ?? 'on',
                readOnly: target.readOnly,
                wordWrap: target.wrap === true ? 'on' : 'off',
            },
        }),
        ...DIFF,
        lightbulb: NO_BULB,
        ...(target.inline === true && { renderSideBySide: false }),
        modifiedAriaLabel: target.modifiedLabel,
        originalAriaLabel: target.originalLabel,
    };
}

/** The two panes are named apart: the diff passes one name to both unless each is told its own. */
function nameThePanes(shown: editor.IDiffEditor, target: DiffTarget): void {
    shown.getOriginalEditor().updateOptions({ ariaLabel: target.originalLabel });
    shown.getModifiedEditor().updateOptions({ ariaLabel: target.modifiedLabel });
}

/**
 * Mounts one diff in an element, over two documents of its own: they are not shared with any
 * other editor, and disposing the diff lets both go. Every change of the right pane is handed
 * out, whoever made it.
 */
export function mountDiffEditor(
    element: HTMLElement,
    target: DiffTarget,
    onChange: (value: string) => void,
): MountedDiffEditor {
    measureCodeTypeOnArrival();

    const original = editor.createModel(target.original, target.language);
    const modified = editor.createModel(target.modified, target.language);
    const shown = editor.createDiffEditor(element, diffOptionsOf(target));
    const heard = modified.onDidChangeContent(() => {
        onChange(modified.getValue());
    });
    const zoom = followTextZoom(shown, element);
    const applied = { target };
    const writing = followCodePreferences(shown, () => diffOptionsOf(applied.target));

    shown.setModel({ modified, original });
    nameThePanes(shown, target);

    return {
        dispose: () => {
            heard.dispose();
            zoom.dispose();
            writing.dispose();
            shown.setModel(null);
            shown.dispose();
            original.dispose();
            modified.dispose();
        },
        getModified: () => modified.getValue(),
        update: (next) => {
            applied.target = next;
            editor.setModelLanguage(original, next.language);
            editor.setModelLanguage(modified, next.language);
            shown.updateOptions(diffOptionsOf(next));
            nameThePanes(shown, next);
            overwriteText(original, next.original);
            (next.readOnly ? overwriteText : replaceText)(modified, next.modified);
        },
    };
}
