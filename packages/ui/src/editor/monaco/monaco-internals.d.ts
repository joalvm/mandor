/** The corners of the editor the window reaches into: the package ships no types for them. */
declare module 'monaco-editor/editor/standalone/browser/standaloneServices.js' {
    export const StandaloneServices: {
        /** Takes the services the window replaces; it counts only before the first service is used. */
        initialize: (overrides: Record<string, unknown>) => unknown;
        /** The one instance of a service, once the services are in. */
        get: (id: unknown) => unknown;
    };
}

declare module 'monaco-editor/editor/common/services/unicodeTextModelHighlighter.js' {
    import type { editor, IRange } from 'monaco-editor/editor/editor.api.js';

    export type UnicodeOptions = Record<string, unknown>;

    /** What the editor found, as the worker would have answered it. */
    export type UnicodeFound = {
        ambiguousCharacterCount: number;
        hasMore: boolean;
        invisibleCharacterCount: number;
        nonBasicAsciiCharacterCount: number;
        ranges: readonly IRange[];
    };

    export const UnicodeTextModelHighlighter: {
        computeUnicodeHighlights: (
            model: editor.ITextModel,
            options: UnicodeOptions,
            range?: IRange,
        ) => UnicodeFound;
    };
}

/** The names of two services: what each instance holds is typed where it is read. */
declare module 'monaco-editor/editor/common/services/editorWorker.js' {
    export const IEditorWorkerService: unknown;
}

declare module 'monaco-editor/editor/common/services/model.js' {
    export const IModelService: unknown;
}

declare module 'monaco-editor/editor/common/diff/linesDiffComputers.js' {
    type Diff = { changes: readonly unknown[]; hitTimeout: boolean; moves: readonly unknown[] };

    export const linesDiffComputers: {
        getDefault: () => {
            computeDiff: (
                original: readonly string[],
                modified: readonly string[],
                options: { ignoreTrimWhitespace: boolean; maxComputationTimeMs: number },
            ) => Diff;
        };
    };
}
