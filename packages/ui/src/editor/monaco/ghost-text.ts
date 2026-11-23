import { type editor, type IDisposable, languages } from 'monaco-editor/editor/editor.api.js';

import type { GhostTextOf } from '../editor-suggestion.js';

/** Who proposes for each document: the provider of a language reads this, so a document is its own. */
const proposers = new WeakMap<editor.ITextModel, GhostTextOf>();

/** The languages that already have our provider: one each, however many documents ask. */
const served = new Set<string>();

const PROVIDER: languages.InlineCompletionsProvider = {
    disposeInlineCompletions: () => undefined,
    provideInlineCompletions: (model, position) => {
        const insertText = proposers.get(model)?.(model.getValue(), model.getOffsetAt(position));

        if (insertText === undefined) {
            return { items: [] };
        }

        return {
            items: [
                {
                    insertText,
                    range: {
                        endColumn: position.column,
                        endLineNumber: position.lineNumber,
                        startColumn: position.column,
                        startLineNumber: position.lineNumber,
                    },
                },
            ],
        };
    },
};

/**
 * Lets a caller propose what comes after the caret in one document, greyed until Tab takes it.
 * The proposal is the caller's, out of rules it knows: the editor guesses nothing. The provider
 * is a language's, registered the first time one of its documents asks, and proposes nothing
 * for a document nobody proposes for.
 */
export function ghostModel(model: editor.ITextModel, ghostTextOf: GhostTextOf): IDisposable {
    const language = model.getLanguageId();

    proposers.set(model, ghostTextOf);

    if (!served.has(language)) {
        served.add(language);
        languages.registerInlineCompletionsProvider(language, PROVIDER);
    }

    return {
        dispose: () => {
            if (proposers.get(model) === ghostTextOf) {
                proposers.delete(model);
            }
        },
    };
}
