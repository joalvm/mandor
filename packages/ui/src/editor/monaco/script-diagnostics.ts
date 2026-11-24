import {
    editor,
    MarkerSeverity,
    MarkerTag,
    type IDisposable,
} from 'monaco-editor/editor/editor.api.js';
import type { Diagnostic } from 'monaco-editor/languages/features/typescript/register.js';

import type { DiagnosticsOf, EditorDiagnostic } from '../editor-diagnostic.js';
import type { WorkerOf } from './script-providers.js';

const OWNER = 'script';

/**
 * What the engine allows and the service would mark: a script is the body of a function, so a
 * `return` at its top is how it ends, and an `await` there is how it waits.
 */
const ENGINE_ALLOWS = new Set([1108, 1375, 1378]);

/** A name the service does not know: `Cannot find name`, with a guess or a hint, or without. */
const UNKNOWN_NAME = new Set([2304, 2552, 2582]);

/** What the caller of each script marks in it, read before the marks of the service are set. */
const explained = new WeakMap<editor.ITextModel, DiagnosticsOf>();

/**
 * Where the caller marks a name the service does not know, the caller's mark stands alone: two
 * marks on one name say the same twice, and the caller knows what the name is.
 */
function isExplained(diagnostic: Diagnostic, marks: readonly EditorDiagnostic[]): boolean {
    const start = diagnostic.start ?? 0;

    return (
        UNKNOWN_NAME.has(diagnostic.code) &&
        marks.some(({ from, to }) => from <= start && start < to)
    );
}

/** Lets the caller of a script explain the names it marks, in place of the service. */
export function explainModel(model: editor.ITextModel, check: DiagnosticsOf): IDisposable {
    explained.set(model, check);

    return {
        dispose: () => {
            if (explained.get(model) === check) {
                explained.delete(model);
            }
        },
    };
}

/** The weight of a mark, by the category TypeScript gives it. */
const SEVERITY_OF: Readonly<Record<number, MarkerSeverity>> = {
    0: MarkerSeverity.Warning,
    1: MarkerSeverity.Error,
    2: MarkerSeverity.Hint,
    3: MarkerSeverity.Info,
};

/** A message of the service: one line, or a chain of them that explain each other. */
function messageOf(text: Diagnostic['messageText']): string {
    if (typeof text === 'string') {
        return text;
    }

    return [text.messageText, ...(text.next ?? []).map(messageOf)].join('\n  ');
}

function markerOf(model: editor.ITextModel, diagnostic: Diagnostic): editor.IMarkerData {
    const start = model.getPositionAt(diagnostic.start ?? 0);
    const end = model.getPositionAt((diagnostic.start ?? 0) + (diagnostic.length ?? 0));

    return {
        code: String(diagnostic.code),
        endColumn: end.column,
        endLineNumber: end.lineNumber,
        message: messageOf(diagnostic.messageText),
        severity: SEVERITY_OF[diagnostic.category] ?? MarkerSeverity.Error,
        startColumn: start.column,
        startLineNumber: start.lineNumber,
        tags: diagnostic.reportsUnnecessary === undefined ? [] : [MarkerTag.Unnecessary],
    };
}

/** Marks a script with what the service says of it, unless it changed while the service read it. */
async function check(workerOf: WorkerOf, model: editor.ITextModel): Promise<void> {
    const version = model.getVersionId();
    const fileName = model.uri.toString();
    const worker = await workerOf(model.uri);
    const found = await Promise.all([
        worker.getSyntacticDiagnostics(fileName),
        worker.getSemanticDiagnostics(fileName),
    ]);

    if (model.isDisposed() || model.getVersionId() !== version) {
        return;
    }

    const callerMarks = explained.get(model)?.(model.getValue()) ?? [];
    const marks = found
        .flat()
        .filter((each) => !ENGINE_ALLOWS.has(each.code) && !isExplained(each, callerMarks));

    editor.setModelMarkers(
        model,
        OWNER,
        marks.map((diagnostic) => markerOf(model, diagnostic)),
    );
}

/** Whoever checks the scripts of the window: again when one changes, or on request. */
export type ScriptChecks = IDisposable & { recheck: (model: editor.ITextModel) => void };

/**
 * Checks every script of the window, now and each time its text settles. A script is checked
 * once its writer pauses: the service reads the program whole, and a check per key would queue
 * readings nobody waits for.
 */
export function checkScripts(workerOf: WorkerOf, pauseMs: number): ScriptChecks {
    const watched = new Map<string, IDisposable>();
    const recheck = (model: editor.ITextModel): void => {
        void check(workerOf, model);
    };

    const forget = (model: editor.ITextModel): void => {
        watched.get(model.uri.toString())?.dispose();
        watched.delete(model.uri.toString());
        editor.setModelMarkers(model, OWNER, []);
    };

    const watch = (model: editor.ITextModel): void => {
        if (model.getLanguageId() !== OWNER || watched.has(model.uri.toString())) {
            return;
        }

        let pending: ReturnType<typeof setTimeout> | undefined;
        const listeners = [
            model.onDidChangeContent(() => {
                clearTimeout(pending);
                // timing-policy: the pause of a writer, not a wait: a check per key would read
                // the program whole for a text that is about to change again.
                pending = setTimeout(recheck, pauseMs, model);
            }),
            model.onWillDispose(() => {
                clearTimeout(pending);
                forget(model);
            }),
        ];

        watched.set(model.uri.toString(), {
            dispose: () => {
                clearTimeout(pending);
                listeners.forEach((listener) => {
                    listener.dispose();
                });
            },
        });
        recheck(model);
    };

    const heard = [
        editor.onDidCreateModel(watch),
        editor.onDidChangeModelLanguage(({ model }) => {
            forget(model);
            watch(model);
        }),
    ];

    editor.getModels().forEach(watch);

    return {
        dispose: () => {
            heard.forEach((listener) => {
                listener.dispose();
            });
            editor.getModels().forEach((model) => {
                if (watched.has(model.uri.toString())) {
                    forget(model);
                }
            });
        },
        recheck,
    };
}
