// The typings of the internals below are ambient, and an import cannot carry an ambient
// declaration into the projects that read this file: only a reference does.
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./monaco-internals.d.ts" />
import type { editor, IRange, Uri } from 'monaco-editor/editor/editor.api.js';
import { IEditorWorkerService } from 'monaco-editor/editor/common/services/editorWorker.js';
import { IModelService } from 'monaco-editor/editor/common/services/model.js';
import {
    UnicodeTextModelHighlighter,
    type UnicodeFound,
    type UnicodeOptions,
} from 'monaco-editor/editor/common/services/unicodeTextModelHighlighter.js';
import { StandaloneServices } from 'monaco-editor/editor/standalone/browser/standaloneServices.js';

/** The one question of the worker this window answers itself. */
type UnicodeWorkers = {
    computedUnicodeHighlights: (
        uri: Uri,
        options: UnicodeOptions,
        range?: IRange,
    ) => Promise<UnicodeFound>;
};

type Models = { getModel: (uri: Uri) => editor.ITextModel | null };

const NOTHING_FOUND: UnicodeFound = {
    ambiguousCharacterCount: 0,
    hasMore: false,
    invisibleCharacterCount: 0,
    nonBasicAsciiCharacterCount: 0,
    ranges: [],
};

/**
 * The characters of a document somebody might not see, looked for right here. The editor asks a
 * worker for them, and this window has none on purpose (see `main-thread-diff.ts`): the question
 * would never be answered, and a bidi in a script would stay as hidden as its author wanted. Only
 * an editor of scripts asks, and a script is small; the computer is the one the worker runs.
 */
function mainThreadUnicode(): void {
    const workers = StandaloneServices.get(IEditorWorkerService) as UnicodeWorkers;
    const models = StandaloneServices.get(IModelService) as Models;

    workers.computedUnicodeHighlights = (uri, options, range) => {
        const model = models.getModel(uri);

        return Promise.resolve(
            model === null
                ? NOTHING_FOUND
                : UnicodeTextModelHighlighter.computeUnicodeHighlights(model, options, range),
        );
    };
}

mainThreadUnicode();
