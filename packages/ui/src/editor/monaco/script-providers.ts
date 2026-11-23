// The typings of the worker are ambient, and an import cannot carry an ambient declaration into
// the projects that read this file: only a reference does.
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./typescript-internals.d.ts" />
import {
    languages,
    Range,
    type editor,
    type IMarkdownString,
    type Uri,
} from 'monaco-editor/editor/editor.api.js';
import type {
    CompletionEntry,
    DocTag,
    SignatureItem,
    SymbolPart,
    TextSpan,
} from 'monaco-editor/languages/features/typescript/tsWorker.js';

import { suggestedAt } from './editor-suggestions.js';
import type { ScriptTsWorker } from './script-ts-worker.js';

/** What the window asks of the service, over the documents of scripts. */
export type ScriptWorker = Pick<
    ScriptTsWorker,
    | 'forgetDeclarations'
    | 'getCompletionEntryDetails'
    | 'getCompletionsAtPosition'
    | 'getQuickInfoAtPosition'
    | 'getSemanticDiagnostics'
    | 'getSignatureHelpItems'
    | 'getSyntacticDiagnostics'
    | 'setDeclarations'
>;

/** The service, once the documents at `uris` reached it as they read now. */
export type WorkerOf = (...uris: Uri[]) => Promise<ScriptWorker>;

/** A suggestion remembers where it was asked, to fetch its text when it is chosen. */
type ScriptCompletion = languages.CompletionItem & { offset: number; uri: Uri };

const Kind = languages.CompletionItemKind;

/** The kind of a name of the service, by the word TypeScript calls it. */
const KIND_OF: Readonly<Record<string, languages.CompletionItemKind>> = {
    alias: Kind.Reference,
    class: Kind.Class,
    const: Kind.Constant,
    constructor: Kind.Constructor,
    enum: Kind.Enum,
    'enum member': Kind.EnumMember,
    function: Kind.Function,
    getter: Kind.Property,
    interface: Kind.Interface,
    keyword: Kind.Keyword,
    let: Kind.Variable,
    'local class': Kind.Class,
    'local function': Kind.Function,
    'local var': Kind.Variable,
    method: Kind.Method,
    module: Kind.Module,
    parameter: Kind.Variable,
    property: Kind.Property,
    setter: Kind.Property,
    type: Kind.Interface,
    var: Kind.Variable,
};

/** How a piece of a tag reads in markdown: a name of a parameter is code. */
const PART_OF: Readonly<Record<string, (text: string) => string>> = {
    parameterName: (text) => `\`${text}\``,
};

function textOf(parts: readonly SymbolPart[] | undefined): string {
    return (parts ?? []).map(({ text }) => text).join('');
}

function tagOf({ name, text }: DocTag): string {
    const parts = (text ?? []).map((part) => (PART_OF[part.kind] ?? String)(part.text));

    return `*@${name}* ${parts.join('')}`.trimEnd();
}

/** The text of a name and its tags, as markdown. */
function docOf(
    documentation: readonly SymbolPart[] | undefined,
    tags: readonly DocTag[] | undefined,
): IMarkdownString {
    return { value: [textOf(documentation), ...(tags ?? []).map(tagOf)].join('\n\n').trim() };
}

function rangeOfSpan(model: editor.ITextModel, span: TextSpan): Range {
    return Range.fromPositions(
        model.getPositionAt(span.start),
        model.getPositionAt(span.start + span.length),
    );
}

function suggestionOf(
    entry: CompletionEntry,
    model: editor.ITextModel,
    word: Range,
    offset: number,
): ScriptCompletion {
    return {
        insertText: entry.insertText ?? entry.name,
        kind: KIND_OF[entry.kind] ?? Kind.Property,
        label: entry.name,
        offset,
        range:
            entry.replacementSpan === undefined ? word : rangeOfSpan(model, entry.replacementSpan),
        sortText: entry.sortText,
        uri: model.uri,
    };
}

/**
 * The names the script can write at the caret; the text of one, once it is chosen. A name the
 * window suggests at the same place is the window's: it knows the value of a variable, and the
 * service only its name.
 */
export function completionsOf(workerOf: WorkerOf): languages.CompletionItemProvider {
    return {
        provideCompletionItems: async (model, position) => {
            const found = model.getWordUntilPosition(position);
            const word = new Range(
                position.lineNumber,
                found.startColumn,
                position.lineNumber,
                found.endColumn,
            );
            const offset = model.getOffsetAt(position);
            const worker = await workerOf(model.uri);
            const info = await worker.getCompletionsAtPosition(model.uri.toString(), offset);

            if (info === undefined || model.isDisposed()) {
                return undefined;
            }

            const shadowed = suggestedAt(model, offset);

            return {
                suggestions: info.entries
                    .filter(({ name }) => !shadowed.has(name))
                    .map((entry) => suggestionOf(entry, model, word, offset)),
            };
        },
        resolveCompletionItem: async (item) => {
            const { label, offset, uri } = item as ScriptCompletion;
            const worker = await workerOf(uri);
            const name = typeof label === 'string' ? label : label.label;
            const details = await worker.getCompletionEntryDetails(uri.toString(), offset, name);

            if (details === undefined) {
                return item;
            }

            return {
                ...item,
                detail: textOf(details.displayParts),
                documentation: docOf(details.documentation, details.tags),
            };
        },
        triggerCharacters: ['.'],
    };
}

function signatureOf(item: SignatureItem): languages.SignatureInformation {
    const parameters = item.parameters.map((parameter) => ({
        documentation: textOf(parameter.documentation),
        label: textOf(parameter.displayParts),
    }));
    const separator = textOf(item.separatorDisplayParts);

    return {
        documentation: docOf(item.documentation, item.tags),
        label: `${textOf(item.prefixDisplayParts)}${parameters.map(({ label }) => label).join(separator)}${textOf(item.suffixDisplayParts)}`,
        parameters,
    };
}

/** The signature of the call the caret stands in, with the parameter it is writing. */
export function signaturesOf(workerOf: WorkerOf): languages.SignatureHelpProvider {
    return {
        provideSignatureHelp: async (model, position) => {
            const worker = await workerOf(model.uri);
            const help = await worker.getSignatureHelpItems(
                model.uri.toString(),
                model.getOffsetAt(position),
                {},
            );

            if (help === undefined || model.isDisposed()) {
                return undefined;
            }

            return {
                dispose: () => undefined,
                value: {
                    activeParameter: help.argumentIndex,
                    activeSignature: help.selectedItemIndex,
                    signatures: help.items.map(signatureOf),
                },
            };
        },
        signatureHelpRetriggerCharacters: [')'],
        signatureHelpTriggerCharacters: ['(', ','],
    };
}

/** What the name under the pointer is: its type, then its text. */
export function hoverOf(workerOf: WorkerOf): languages.HoverProvider {
    return {
        provideHover: async (model, position) => {
            const worker = await workerOf(model.uri);
            const info = await worker.getQuickInfoAtPosition(
                model.uri.toString(),
                model.getOffsetAt(position),
            );

            if (info === undefined || model.isDisposed()) {
                return undefined;
            }

            return {
                contents: [
                    { value: `\`\`\`typescript\n${textOf(info.displayParts)}\n\`\`\`` },
                    docOf(info.documentation, info.tags),
                ],
                range: rangeOfSpan(model, info.textSpan),
            };
        },
    };
}
