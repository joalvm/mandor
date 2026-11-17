import { editor, type IDisposable } from 'monaco-editor/editor/editor.api.js';

import type {
    EditorVariable,
    EditorVariableHover,
    EditorVariables,
    OnVariableHover,
} from '../editor-variable.js';
import { rangeOf } from './model-text.js';

type Found = () => readonly EditorVariable[];

function decorationOf(
    model: editor.ITextModel,
    variable: EditorVariable,
): editor.IModelDeltaDecoration {
    return {
        options: { inlineClassName: `mandor-variable mandor-variable-${variable.tone}` },
        range: rangeOf(model, variable.from, variable.to),
    };
}

/** The box a variable is drawn in, in the coordinates of the window, for a popover to sit on. */
function rectOf(
    shown: editor.ICodeEditor,
    model: editor.ITextModel,
    variable: EditorVariable,
): DOMRect | null {
    const head = shown.getScrolledVisiblePosition(model.getPositionAt(variable.from));
    const tail = shown.getScrolledVisiblePosition(model.getPositionAt(variable.to));
    const box = shown.getDomNode()?.getBoundingClientRect();

    if (head === null || tail === null || box === undefined) {
        return null;
    }

    const top = Math.min(head.top, tail.top);
    const bottom = Math.max(head.top + head.height, tail.top + tail.height);

    return new DOMRect(
        box.left + Math.min(head.left, tail.left),
        box.top + top,
        Math.abs(tail.left - head.left),
        bottom - top,
    );
}

/** The named variable under the pointer, its two ends included, or nothing. */
function hoverAt(
    shown: editor.ICodeEditor,
    found: Found,
    target: editor.IMouseTarget,
): EditorVariableHover | null {
    const model = shown.getModel();

    if (
        model === null ||
        target.position === null ||
        target.type !== editor.MouseTargetType.CONTENT_TEXT
    ) {
        return null;
    }

    const offset = model.getOffsetAt(target.position);
    const variable = found().find(
        (each) => each.name !== undefined && each.from <= offset && offset <= each.to,
    );

    if (variable?.name === undefined) {
        return null;
    }

    const rect = rectOf(shown, model, variable);

    return rect === null ? null : { name: variable.name, rect };
}

function watchHover(
    shown: editor.ICodeEditor,
    found: Found,
    onHover: OnVariableHover,
): IDisposable[] {
    return [
        shown.onMouseMove((event) => {
            onHover(hoverAt(shown, found, event.target));
        }),
        shown.onMouseLeave(() => {
            onHover(null);
        }),
    ];
}

/**
 * Marks the variables of the document and names the one under the pointer so a panel can open
 * over it. Inside an editor a variable is set apart by its slant alone and keeps the colour of
 * the text it is written in; a field, with no syntax to keep, paints it in its tone. Each mark
 * still names the tone the environment earns it. They are marked again as the text is written.
 */
export function paintVariables(shown: editor.ICodeEditor, variables: EditorVariables): IDisposable {
    const painted = shown.createDecorationsCollection();
    const state: { found: readonly EditorVariable[] } = { found: [] };
    const paint = (): void => {
        const model = shown.getModel();

        state.found = model === null ? [] : variables.variablesOf(model.getValue());
        painted.set(
            model === null ? [] : state.found.map((variable) => decorationOf(model, variable)),
        );
    };

    const { onHover } = variables;
    const listeners = [
        shown.onDidChangeModelContent(paint),
        shown.onDidChangeModel(paint),
        ...(onHover === undefined ? [] : watchHover(shown, () => state.found, onHover)),
    ];

    paint();

    return {
        dispose: () => {
            listeners.forEach((listener) => {
                listener.dispose();
            });
            painted.clear();
        },
    };
}
