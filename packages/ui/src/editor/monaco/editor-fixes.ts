import { type editor, type IDisposable, languages } from 'monaco-editor/editor/editor.api.js';

import type { EditorFix, FixesOf } from '../editor-fix.js';
import { rangeOf } from './model-text.js';

/** Who fixes each document: the provider of a language reads this, so a document is its own. */
const fixers = new WeakMap<editor.ITextModel, FixesOf>();

/** The languages that already have our provider: one each, however many documents ask. */
const served = new Set<string>();

function actionOf(model: editor.ITextModel, fix: EditorFix): languages.CodeAction {
    const versionId = model.getVersionId();

    return {
        edit: {
            edits: fix.edits.map(({ from, text, to }) => ({
                resource: model.uri,
                textEdit: { range: rangeOf(model, from, to), text },
                versionId,
            })),
        },
        kind: 'quickfix',
        title: fix.title,
    };
}

const PROVIDER: languages.CodeActionProvider = {
    provideCodeActions: (model, range) => {
        const from = model.getOffsetAt({ column: 1, lineNumber: range.startLineNumber });
        const to = model.getOffsetAt({
            column: model.getLineMaxColumn(range.endLineNumber),
            lineNumber: range.endLineNumber,
        });
        const fixes = fixers.get(model)?.(model.getValue(), { from, to }) ?? [];

        return {
            actions: fixes.map((fix) => actionOf(model, fix)),
            dispose: () => undefined,
        };
    },
};

/**
 * Lets a caller offer fixes in one document, under the bulb, for the lines the caret or the
 * selection covers. The fixes are the caller's, out of rules it knows: the editor fixes nothing
 * of its own. The provider is a language's, registered the first time one of its documents
 * asks, and offers nothing for a document nobody fixes.
 */
export function fixModel(model: editor.ITextModel, fixesOf: FixesOf): IDisposable {
    const language = model.getLanguageId();

    fixers.set(model, fixesOf);

    if (!served.has(language)) {
        served.add(language);
        languages.registerCodeActionProvider(language, PROVIDER);
    }

    return {
        dispose: () => {
            if (fixers.get(model) === fixesOf) {
                fixers.delete(model);
            }
        },
    };
}
