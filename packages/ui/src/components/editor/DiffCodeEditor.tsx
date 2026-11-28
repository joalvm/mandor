import { useRef } from 'react';

import type { EditorLanguage } from '../../editor/editor-language.js';
import { useDiffCodeEditor } from '../../hooks/useDiffCodeEditor.js';
import { EditorSkeleton } from './EditorSkeleton.js';

/** What the diff and its two panes are called. The words belong to whoever mounts it. */
type DiffCodeEditorLabels = { editor: string; modified: string; original: string };

type DiffCodeEditorProps = {
    /** Keeps the two panes one above the other, whatever room the diff has. */
    inline?: boolean | undefined;
    labels: DiffCodeEditorLabels;
    language: EditorLanguage;
    /** Whether the lines are numbered; they are when it is not said. */
    lineNumbers?: 'off' | 'on' | undefined;
    /** The text of the right pane, which is the result. */
    modified: string;
    /** Heard on every change of the right pane, so the result is whatever it holds. */
    onModifiedChange?: ((value: string) => void) | undefined;
    /** The text of the left pane, which nobody writes. */
    original: string;
    /** Makes the right pane as read-only as the left. */
    readOnly?: boolean | undefined;
    /** Wraps long lines in both panes instead of scrolling them sideways. */
    wrap?: boolean | undefined;
};

/**
 * Two versions of one text side by side, the lines that differ marked: the editor of the app in
 * the theme of the app. The left pane is read; the right one is written, unless the whole diff
 * is only read.
 */
export function DiffCodeEditor({
    inline = false,
    labels,
    language,
    lineNumbers = 'on',
    modified,
    onModifiedChange,
    original,
    readOnly = false,
    wrap = false,
}: DiffCodeEditorProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useDiffCodeEditor({
        containerRef,
        onModifiedChange: readOnly ? undefined : onModifiedChange,
        target: {
            inline,
            language,
            lineNumbers,
            modified,
            modifiedLabel: labels.modified,
            original,
            originalLabel: labels.original,
            readOnly,
            wrap,
        },
    });

    return (
        <div
            aria-label={labels.editor}
            className="h-full min-h-0 min-w-0"
            data-language={language}
            dir="ltr"
            data-part="diff-code-editor"
            data-read-only={readOnly}
            ref={containerRef}
            role="group"
        >
            <EditorSkeleton />
        </div>
    );
}
