// The typings of the two internals below are ambient, and an import cannot carry an ambient
// declaration into the projects that read this file: only a reference does.
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./monaco-internals.d.ts" />
// The editor and its comparison are registered before they are replaced: a replacement of a
// service that is not registered yet is dropped.
import 'monaco-editor/editor/editor.api.js';
import 'monaco-editor/editor/browser/widget/diffEditor/diffProviderFactoryService.js';

// The import above runs the module; this one only names its types, and is erased.
// eslint-disable-next-line no-duplicate-imports
import type { editor } from 'monaco-editor/editor/editor.api.js';
import { linesDiffComputers } from 'monaco-editor/editor/common/diff/linesDiffComputers.js';
import { StandaloneServices } from 'monaco-editor/editor/standalone/browser/standaloneServices.js';

type DiffOptions = { ignoreTrimWhitespace: boolean; maxComputationTimeMs: number };

const NOBODY = { dispose: () => undefined };

/**
 * The comparison of two documents, made right here. The standard one asks a worker for it, and
 * this window has none on purpose: a worker that asks the scheme of the window for its script
 * never starts, and the policy of the window does not allow one. A diff of two texts a person
 * reads is small, and the computer is the same one the worker runs.
 */
export const mainThreadDiff = {
    computeDiff: (
        original: editor.ITextModel,
        modified: editor.ITextModel,
        options: DiffOptions,
    ) => {
        // A diff that outlives its documents asks about them once they are gone: nothing differs.
        if (original.isDisposed() || modified.isDisposed()) {
            return Promise.resolve({ changes: [], identical: true, moves: [], quitEarly: false });
        }

        const diff = linesDiffComputers
            .getDefault()
            .computeDiff(original.getLinesContent(), modified.getLinesContent(), options);

        return Promise.resolve({
            changes: diff.changes,
            identical: diff.changes.length === 0 && original.getValue() === modified.getValue(),
            moves: diff.moves,
            quitEarly: diff.hitTimeout,
        });
    },
    dispose: () => undefined,
    onDidChange: () => NOBODY,
    setOptions: () => undefined,
};

/** Hands the editor its own comparison, before the first service of the window is used. */
StandaloneServices.initialize({
    diffProviderFactoryService: { createDiffProvider: () => mainThreadDiff },
});
