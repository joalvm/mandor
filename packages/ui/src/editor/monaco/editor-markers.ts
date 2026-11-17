import { loadedSchemaChecker, onSchemaCheckerLoaded } from '@mandor/validate';
import { editor, type IDisposable, MarkerSeverity } from 'monaco-editor/editor/editor.api.js';

import type { DiagnosticsOf, EditorDiagnostic } from '../editor-diagnostic.js';
import { rangeOf } from './model-text.js';

const OWNER = 'mandor';

/** Long enough for a word to be finished, short enough to still read as the answer to it. */
const PAUSE_MS = 300;

/** The marker each severity of a diagnostic draws. */
const MARKER_SEVERITY: Readonly<Record<EditorDiagnostic['severity'], MarkerSeverity>> = {
    error: MarkerSeverity.Error,
    warning: MarkerSeverity.Warning,
};

/** How many views check each document right now. */
const checkers = new WeakMap<editor.ITextModel, number>();

function markerOf(model: editor.ITextModel, diagnostic: EditorDiagnostic): editor.IMarkerData {
    return {
        ...rangeOf(model, diagnostic.from, diagnostic.to),
        message: diagnostic.message,
        severity: MARKER_SEVERITY[diagnostic.severity],
    };
}

/** Sets the marks of a document to these, and takes away any that were there. */
function markModel(model: editor.ITextModel, diagnostics: readonly EditorDiagnostic[]): void {
    editor.setModelMarkers(
        model,
        OWNER,
        diagnostics.map((found) => markerOf(model, found)),
    );
}

/** The marks belong to the document, not to a view of it: they go with the last view that checks it. */
function stopChecking(model: editor.ITextModel): void {
    const left = (checkers.get(model) ?? 1) - 1;

    checkers.set(model, left);

    if (left === 0) {
        editor.setModelMarkers(model, OWNER, []);
    }
}

/**
 * Marks what is wrong with a document: at once when it starts, and again a pause after the
 * text stops changing, so a word being typed is not marked wrong at every letter, and once more
 * when the schema checker arrives, if it had not when the document started. A document
 * that goes away takes its marks with it: opened again under the same name, it starts clean.
 */
export function lintModel(model: editor.ITextModel, diagnosticsOf: DiagnosticsOf): IDisposable {
    const pending: { stopped: boolean; timer: ReturnType<typeof setTimeout> | undefined } = {
        stopped: false,
        timer: undefined,
    };
    const listeners: IDisposable[] = [];
    const mark = (): void => {
        markModel(model, diagnosticsOf(model.getValue()));
    };

    const stop = (): void => {
        if (pending.stopped) {
            return;
        }

        pending.stopped = true;
        clearTimeout(pending.timer);
        listeners.forEach((listener) => {
            listener.dispose();
        });
        stopChecking(model);
    };

    listeners.push(
        model.onDidChangeContent(() => {
            clearTimeout(pending.timer);
            pending.timer = setTimeout(mark, PAUSE_MS);
        }),
        model.onWillDispose(stop),
    );

    // A schema beside the text is checked once the checker loads: marked again when it arrives.
    if (loadedSchemaChecker() === null) {
        listeners.push({ dispose: onSchemaCheckerLoaded(mark) });
    }

    checkers.set(model, (checkers.get(model) ?? 0) + 1);
    mark();

    return { dispose: stop };
}
