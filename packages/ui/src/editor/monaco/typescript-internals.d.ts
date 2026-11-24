/**
 * The corners of the TypeScript service of Monaco the script language reaches into: the worker
 * class and the bootstrap of its thread. The package ships no types for them, and the answers of
 * the service are typed as far as the window reads them, out of what TypeScript returns.
 */
declare module 'monaco-editor/languages/features/typescript/tsWorker.js' {
    import type { Diagnostic } from 'monaco-editor/languages/features/typescript/register.js';

    /** A document as the worker holds it: synced from the window, by uri. */
    export type MirrorModel = {
        readonly uri: { toString: () => string };
        readonly version: number;
        getValue: () => string;
    };

    export type WorkerContext = { getMirrorModels: () => readonly MirrorModel[] };

    /** What the service starts with: the options of the compiler and the libraries beside them. */
    export type WorkerData = {
        compilerOptions: Record<string, unknown>;
        extraLibs: Record<string, { content: string; version: number }>;
    };

    export type Snapshot = {
        getChangeRange: () => undefined;
        getLength: () => number;
        getText: (start: number, end: number) => string;
    };

    /** One piece of a text the service writes: a name, a keyword, a space. */
    export type SymbolPart = { kind: string; text: string };

    export type DocTag = { name: string; text?: readonly SymbolPart[] | undefined };

    export type TextSpan = { length: number; start: number };

    export type CompletionEntry = {
        insertText?: string | undefined;
        kind: string;
        name: string;
        replacementSpan?: TextSpan | undefined;
        sortText: string;
    };

    export type CompletionInfo = { entries: readonly CompletionEntry[] };

    export type CompletionDetails = {
        displayParts: readonly SymbolPart[];
        documentation?: readonly SymbolPart[] | undefined;
        tags?: readonly DocTag[] | undefined;
    };

    export type SignatureParameter = {
        displayParts: readonly SymbolPart[];
        documentation: readonly SymbolPart[];
    };

    export type SignatureItem = {
        documentation: readonly SymbolPart[];
        parameters: readonly SignatureParameter[];
        prefixDisplayParts: readonly SymbolPart[];
        separatorDisplayParts: readonly SymbolPart[];
        suffixDisplayParts: readonly SymbolPart[];
        tags: readonly DocTag[];
    };

    export type SignatureHelp = {
        argumentIndex: number;
        items: readonly SignatureItem[];
        selectedItemIndex: number;
    };

    export type QuickInfo = {
        displayParts?: readonly SymbolPart[] | undefined;
        documentation?: readonly SymbolPart[] | undefined;
        tags?: readonly DocTag[] | undefined;
        textSpan: TextSpan;
    };

    export class TypeScriptWorker {
        constructor(ctx: WorkerContext, createData: WorkerData);
        getScriptVersion(fileName: string): string;
        getScriptSnapshot(fileName: string): Snapshot | undefined;
        /** The scripts the window keeps in the worker, by the names the window gave them. */
        getScriptFileNames(): string[];
        getSyntacticDiagnostics(fileName: string): Promise<Diagnostic[]>;
        getSemanticDiagnostics(fileName: string): Promise<Diagnostic[]>;
        getCompletionsAtPosition(
            fileName: string,
            position: number,
        ): Promise<CompletionInfo | undefined>;
        getCompletionEntryDetails(
            fileName: string,
            position: number,
            entry: string,
        ): Promise<CompletionDetails | undefined>;
        getSignatureHelpItems(
            fileName: string,
            position: number,
            options: Record<string, never>,
        ): Promise<SignatureHelp | undefined>;
        getQuickInfoAtPosition(fileName: string, position: number): Promise<QuickInfo | undefined>;
    }
}

declare module 'monaco-editor/languages/features/typescript/lib/typescriptServices.js' {
    /** The language service the worker runs, of which the window reads one rule. */
    export const typescript: {
        /** The path the service makes of a name: no empty step, none that steps back. */
        normalizePath: (path: string) => string;
    };
}

declare module 'monaco-editor/internal/common/initialize.js' {
    import type {
        WorkerContext,
        WorkerData,
    } from 'monaco-editor/languages/features/typescript/tsWorker.js';

    /** Hands the second message of the window, what the service starts with, to `create`. */
    export function initialize(
        create: (ctx: WorkerContext, createData: WorkerData) => unknown,
    ): void;
}

declare module 'monaco-editor/languages/definitions/javascript/javascript.js' {
    import type { languages } from 'monaco-editor/editor/editor.api.js';

    export const conf: languages.LanguageConfiguration;
    export const language: languages.IMonarchLanguage;
}
