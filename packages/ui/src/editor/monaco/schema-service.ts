// The same library the JSON language of Monaco carries, at the version it carries: the
// service of the standard and the documents it reads, with their own types.
import { getLanguageService } from 'vscode-json-languageservice';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
    editor,
    languages,
    MarkerSeverity,
    type Position,
} from 'monaco-editor/editor/editor.api.js';

import { SCHEMA_DOCUMENTS } from './metaschemas/schema-schemas.js';

/**
 * The service of the standard (`vscode-json-languageservice`) over the documents of the
 * window, in the editor's own thread. The same service also rides inside Monaco behind a
 * worker, which would hold a copy of every JSON document the window opens, and a schema is
 * small: the service answers here, out of the metaschemas of the standard, which arrive as data.
 * Validation, completion and hover, and nothing guessed beyond them.
 */

/** One answer of the validation, in the words of the service. */
type ValidationOfService = {
    message: string;
    range: {
        end: { character: number; line: number };
        start: { character: number; line: number };
    };
    severity?: number | undefined;
};

/** The document of a model, as the service reads it: uri, language, version and text. */
type TextDocumentOfService = ReturnType<typeof TextDocument.create>;

/** The service of every schema document of the window: one thread, one instance. */
const service = getLanguageService({});

// The metaschema of the draft a document names — 2020-12 by the file pattern, draft-07 when
// the `$schema` says so — and nothing else, for a schema of the app never names another. No
// schema ever comes from the network: the ones of the standard arrive as data.
service.configure({
    schemas: SCHEMA_DOCUMENTS.map((document) => ({ ...document })),
    validate: true,
});

/** The documents the service reads, one per model the window holds in `json`. */
const documents = new Map<string, TextDocumentOfService>();

function documentOf(model: editor.ITextModel): TextDocumentOfService {
    const key = model.uri.toString();
    const found = documents.get(key);

    if (found === undefined) {
        const made = TextDocument.create(key, 'json', 1, model.getValue());

        documents.set(key, made);

        return made;
    }

    const text = model.getValue();

    if (found.getText() === text) {
        return found;
    }

    const next = TextDocument.create(key, 'json', found.version + 1, text);

    documents.set(key, next);

    return next;
}

/** Forgets the document of a model the window took away. */
export function forget(uri: string): void {
    documents.delete(uri);
}

/** The column of a position of the editor, said in characters from the head of its line. */
function characterOf(model: editor.ITextModel, position: Position): number {
    return (
        model.getOffsetAt({ column: position.column, lineNumber: position.lineNumber }) -
        model.getOffsetAt({ column: 1, lineNumber: position.lineNumber })
    );
}

/** The marks of the model, said where the editor reads them. */
export async function validate(model: editor.ITextModel): Promise<void> {
    const document = documentOf(model);
    const jsonDocument = service.parseJSONDocument(document);
    const found = (await service.doValidation(document, jsonDocument, {
        // A schema of the app speaks JSONC: the comments are the document's own, and only a
        // trailing comma and what the metaschema refuses are said as errors.
        comments: 'ignore',
        schemaValidation: 'error',
        trailingCommas: 'error',
    })) as ValidationOfService[];

    editor.setModelMarkers(
        model,
        'json',
        found.map((diagnostic) => ({
            endColumn: diagnostic.range.end.character + 1,
            endLineNumber: diagnostic.range.end.line + 1,
            message: diagnostic.message,
            severity: diagnostic.severity === 2 ? MarkerSeverity.Warning : MarkerSeverity.Error,
            startColumn: diagnostic.range.start.character + 1,
            startLineNumber: diagnostic.range.start.line + 1,
        })),
    );
}

/** What the service offers where the caret is, as the editor reads a completion. */
export async function complete(
    model: editor.ITextModel,
    position: Position,
): Promise<languages.CompletionList> {
    const document = documentOf(model);
    const jsonDocument = service.parseJSONDocument(document);
    const list = await service.doComplete(
        document,
        { character: characterOf(model, position), line: position.lineNumber - 1 },
        jsonDocument,
    );

    if (list === null) {
        return { suggestions: [] };
    }

    return {
        suggestions: list.items.map((item) => {
            const label = item.label;
            const word = model.getWordUntilPosition(position);
            const said = {
                insertText: item.insertText ?? label,
                kind: languages.CompletionItemKind.Value,
                label,
                range: {
                    endColumn: word.endColumn,
                    endLineNumber: position.lineNumber,
                    startColumn: word.startColumn,
                    startLineNumber: position.lineNumber,
                },
            };

            // The extras of the answer go in only where the service has them: the editor
            // takes a property that is not there as a property that says nothing.
            return {
                ...said,
                ...(item.detail === undefined ? {} : { detail: item.detail }),
                ...(item.sortText === undefined ? {} : { sortText: item.sortText }),
            };
        }),
    };
}

/** The text of one answer of the hover, said whatever shape the service used for it. */
function saidHover(contents: unknown): string {
    if (typeof contents === 'string') {
        return contents;
    }

    if (Array.isArray(contents)) {
        return contents.map((part) => textOfPart(part)).join('\n\n');
    }

    return textOfPart(contents);
}

/** The text of one part of an answer, which the service may carry with its language. */
function textOfPart(part: unknown): string {
    if (typeof part === 'string') {
        return part;
    }

    if (typeof part === 'object' && part !== null && 'value' in part) {
        return String(part.value);
    }

    return '';
}

/** What the service says about where the caret is, as the editor reads a hover. */
export async function hover(
    model: editor.ITextModel,
    position: Position,
): Promise<languages.Hover | undefined> {
    const document = documentOf(model);
    const jsonDocument = service.parseJSONDocument(document);
    const found = await service.doHover(
        document,
        { character: characterOf(model, position), line: position.lineNumber - 1 },
        jsonDocument,
    );

    if (found === null) {
        return undefined;
    }

    const said = saidHover(found.contents);

    if (said === '') {
        return undefined;
    }

    return { contents: [{ value: said }] };
}
