import { useMessages } from '@mandor/i18n';
import { CodeEditor, type CodeEditorHandle, type EditorOptions } from '@mandor/ui';
import { useEffect, useRef } from 'react';

import type { BodyContent } from './lib/body-content.js';
import { wantsNextWindow } from './lib/next-window.js';

type BodyTextProps = {
    content: BodyContent;
    /** The document of the editor: one body in one format keeps its view, a new one starts over. */
    modelKey: string;
    /** Called when the reader nears the end of what is in; the owner reads the next window. */
    onNearEnd: () => void;
    wrap: boolean;
};

/** A reader, not an editor: the body is what arrived and nobody types in it. */
const WRAPPED: EditorOptions = { lineNumbers: 'on', readOnly: true, wordWrap: 'on' };
const UNWRAPPED: EditorOptions = { lineNumbers: 'on', readOnly: true, wordWrap: 'off' };

/**
 * A body read as text in the editor. The next window is asked for by where the view stands in the
 * text, in pixels: the editor tells of a new size of its text as a scroll, so a text that fits the
 * view asks for the rest as soon as it is drawn, and a long one when it is read near its end.
 */
export function BodyText({ content, modelKey, onNearEnd, wrap }: BodyTextProps) {
    const labels = useMessages('requests');
    const editor = useRef<CodeEditorHandle>(null);

    useEffect(() => {
        if (wantsNextWindow(editor.current?.view())) {
            onNearEnd();
        }
    }, [content.text, onNearEnd]);

    return (
        <CodeEditor
            labels={{
                editor: labels('body'),
            }}
            language={content.language}
            modelKey={modelKey}
            onScroll={() => {
                if (wantsNextWindow(editor.current?.view())) {
                    onNearEnd();
                }
            }}
            options={wrap ? WRAPPED : UNWRAPPED}
            ref={editor}
            value={content.text}
        />
    );
}
