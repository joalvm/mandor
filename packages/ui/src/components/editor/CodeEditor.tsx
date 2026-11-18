import { useImperativeHandle, useRef, type Ref } from 'react';
import { rangeOfPointer } from '@mandor/validate';

import type { EditorLanguage } from '../../editor/editor-language.js';
import { isReadOnly, type EditorOptions } from '../../editor/editor-options.js';
import type { EditorView } from '../../editor/monaco/mount-editor.js';
import type { EditorCommandId } from '../../editor/monaco/run-command.js';
import { useCodeEditor } from '../../hooks/useCodeEditor.js';
import { EditorSkeleton } from './EditorSkeleton.js';

/** What the editor is called. The words belong to whoever mounts it; its menu is Monaco's. */
type CodeEditorLabels = { editor: string };

type CodeEditorProps = {
    labels: CodeEditorLabels;
    language: EditorLanguage;
    /** The document, not the view: two views of one key share its text and its undo. */
    modelKey: string;
    /** Heard on every move of the view, so a second view of the text can follow it. */
    onScroll?: (() => void) | undefined;
    onValueChange?: ((value: string) => void) | undefined;
    options?: EditorOptions | undefined;
    /** The holder's way in, for what it runs from a button of its own. */
    ref?: Ref<CodeEditorHandle> | undefined;
    value: string;
};

/** What a holder runs on its editor from a button of its own. A run never fails; it says `false`. */
export type CodeEditorHandle = {
    run: (id: EditorCommandId) => Promise<boolean>;
    /**
     * Selects the value a JSON Pointer names in the text and brings it into view. A pointer that
     * lands nowhere, or a view that is not mounted, leaves everything where it was.
     */
    selectPointer: (pointer: string) => void;
    /** Puts a line at the top of the view. A view that is not mounted stays where it was. */
    showLine: (line: number) => void;
    /** The line the view opens on, and 1 while there is no view to ask. */
    topLine: () => number;
    /** Where the view stands in the text; all of it zero while there is no view to ask. */
    view: () => EditorView;
};

const NO_VIEW: EditorView = {
    height: 0,
    scrollHeight: 0,
    scrollLeft: 0,
    scrollTop: 0,
    scrollWidth: 0,
    width: 0,
};

const NO_OPTIONS: EditorOptions = {};

/**
 * The one editor of the app: JSON with comments, XML, HTML, markdown and the dump of a frame
 * that was never text, written or only read. What a dump reads like is the caller's — `HexView`
 * lays it out — and nobody writes one. A view that is only read tells nobody about its text: the
 * view that writes the document already tells.
 */
export function CodeEditor({
    labels,
    language,
    modelKey,
    onScroll,
    onValueChange,
    options = NO_OPTIONS,
    ref,
    value,
}: CodeEditorProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const readOnly = isReadOnly(language, options);
    const editor = useCodeEditor({
        containerRef,
        onScroll,
        onValueChange: readOnly ? undefined : onValueChange,
        target: { ariaLabel: labels.editor, language, modelKey, options, value },
    });
    const run = (id: EditorCommandId): Promise<boolean> =>
        editor.current?.run(id) ?? Promise.resolve(false);

    useImperativeHandle(ref, () => ({
        run,
        selectPointer: (pointer: string) => {
            const mounted = editor.current;
            const range =
                mounted === null ? undefined : rangeOfPointer(mounted.getValue(), pointer);

            if (range !== undefined) {
                mounted?.select(range);
            }
        },
        showLine: (line: number) => {
            editor.current?.showLine(line);
        },
        topLine: () => editor.current?.topLine() ?? 1,
        view: () => editor.current?.view() ?? NO_VIEW,
    }));

    return (
        <div
            aria-label={labels.editor}
            className="h-full min-h-0 min-w-0"
            data-language={language}
            data-part="code-editor"
            data-read-only={readOnly}
            ref={containerRef}
            role="group"
        >
            <EditorSkeleton />
        </div>
    );
}
