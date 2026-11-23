import {
    type editor,
    type IDisposable,
    type IRange,
    languages,
    type Position,
} from 'monaco-editor/editor/editor.api.js';

import type { EditorSuggestion, SuggestionsOf } from '../editor-suggestion.js';

/** Who suggests for each document: the provider of a language reads this, so a document is its own. */
const suggesters = new WeakMap<editor.ITextModel, SuggestionsOf>();

/** The languages that already have our provider: one each, however many documents ask. */
const served = new Set<string>();

const KIND_OF: Record<EditorSuggestion['kind'], languages.CompletionItemKind> = {
    argument: languages.CompletionItemKind.Property,
    directive: languages.CompletionItemKind.Function,
    enum: languages.CompletionItemKind.EnumMember,
    field: languages.CompletionItemKind.Field,
    fragment: languages.CompletionItemKind.Struct,
    keyword: languages.CompletionItemKind.Keyword,
    other: languages.CompletionItemKind.Text,
    snippet: languages.CompletionItemKind.Snippet,
    type: languages.CompletionItemKind.Class,
    variable: languages.CompletionItemKind.Variable,
};

/** How the text of a kind is written: a snippet's has places to fill, any other's is the text. */
const RULES_OF: Partial<Record<EditorSuggestion['kind'], languages.CompletionItemInsertTextRule>> =
    {
        snippet: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    };

/** What opens a suggestion by itself: the characters after which GraphQL expects a name. */
const TRIGGERS = ['{', '(', ':', '@', '$', '.'];

/** A script names a variable or a header in a string: the quote that opens it opens the list. */
const TRIGGERS_OF: Partial<Record<string, string[]>> = {
    script: [...TRIGGERS, '"', "'", '`'],
};

function itemOf(suggestion: EditorSuggestion, range: IRange): languages.CompletionItem {
    const rules = RULES_OF[suggestion.kind];

    return {
        ...(suggestion.detail === undefined ? {} : { detail: suggestion.detail }),
        ...(suggestion.documentation === undefined
            ? {}
            : { documentation: suggestion.documentation }),
        ...(rules === undefined ? {} : { insertTextRules: rules }),
        insertText: suggestion.insertText,
        kind: KIND_OF[suggestion.kind],
        label: suggestion.label,
        range,
    };
}

/** What a suggestion replaces: from the offset it gives, or the word at the caret, to the caret. */
function rangeOf(model: editor.ITextModel, position: Position, from: number | undefined): IRange {
    const start =
        from === undefined
            ? model.getWordUntilPosition(position).startColumn
            : model.getPositionAt(from).column;

    return {
        endColumn: position.column,
        endLineNumber: position.lineNumber,
        startColumn: start,
        startLineNumber: position.lineNumber,
    };
}

/** The names a caller suggests at a place of a document: another source of names leaves them out. */
export function suggestedAt(model: editor.ITextModel, offset: number): ReadonlySet<string> {
    const suggestionsOf = suggesters.get(model);

    return new Set(suggestionsOf?.(model.getValue(), offset).map(({ label }) => label));
}

const PROVIDER: languages.CompletionItemProvider = {
    provideCompletionItems: (model, position) => {
        const suggestionsOf = suggesters.get(model);

        if (suggestionsOf === undefined) {
            return { suggestions: [] };
        }

        return {
            suggestions: suggestionsOf(model.getValue(), model.getOffsetAt(position)).map(
                (suggestion) => itemOf(suggestion, rangeOf(model, position, suggestion.from)),
            ),
        };
    },
};

/**
 * Lets a caller suggest in one document. The editor has no suggestions of its own to give: the
 * words come from whoever mounted it, which knows the language of the text better than the
 * editor does. The provider is a language's, registered the first time one of its documents
 * asks, and answers nothing for a document nobody suggests for.
 */
export function suggestModel(model: editor.ITextModel, suggestionsOf: SuggestionsOf): IDisposable {
    const language = model.getLanguageId();

    suggesters.set(model, suggestionsOf);

    if (!served.has(language)) {
        served.add(language);
        languages.registerCompletionItemProvider(language, {
            ...PROVIDER,
            triggerCharacters: TRIGGERS_OF[language] ?? TRIGGERS,
        });
    }

    return {
        dispose: () => {
            if (suggesters.get(model) === suggestionsOf) {
                suggesters.delete(model);
            }
        },
    };
}
