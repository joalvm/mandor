import { CodeEditor, type CodeEditorHandle, type EditorOptions } from '@mandor/ui';
import type { Ref } from 'react';

type DocEditorProps = {
    /** Read where it is drawn: this package holds no text of its own. */
    label: string;
    /** The resource, not the tab: two views of one file share the model and the undo with it. */
    modelKey: string;
    onChange: (text: string) => void;
    /** Heard on every move of the view, for whoever keeps a second view level with it. */
    onScroll?: (() => void) | undefined;
    /** The holder's way to the editor, to keep a second view level with it. */
    ref?: Ref<CodeEditorHandle> | undefined;
    value: string;
};

/**
 * Whoever opens the editor of a doc came to write in it, so the caret is already in the text.
 * A doc is prose and reads whole: a long line folds into the width it has, as VS Code does with
 * markdown. The lines are numbered, because a doc is read as a page and written as a file, and
 * the file is the side where a number is what somebody else's report can be found by.
 */
const OPTIONS: EditorOptions = { focusOnMount: true, lineNumbers: 'on', wordWrap: 'on' };

/**
 * The editor of a doc. It writes markdown and nothing else: there is no saving, no dot and no
 * question on the way out, because whoever holds it puts every change on disk. The file can also
 * change with nobody typing — `Revertir doc` writes it back from the history — and the editor
 * follows the value it is handed.
 */
export function DocEditor({ label, modelKey, onChange, onScroll, ref, value }: DocEditorProps) {
    return (
        <CodeEditor
            labels={{ editor: label }}
            language="markdown"
            modelKey={modelKey}
            onScroll={onScroll}
            onValueChange={onChange}
            options={OPTIONS}
            ref={ref}
            value={value}
        />
    );
}
