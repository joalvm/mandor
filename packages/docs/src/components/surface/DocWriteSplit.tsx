import { useMessages } from '@mandor/i18n';
import { SplitHalf, SplitPane, type CodeEditorHandle } from '@mandor/ui';
import { useRef, useState } from 'react';

import type { DocSurfaceDoc } from '../../doc-view-state.js';
import { useDocScrollSync } from '../../hooks/useDocScrollSync.js';
import { toggledTask } from '../../lib/toggle-task.js';
import { DocEditor } from '../editor/DocEditor.js';
import { DocPage } from '../view/DocPage.js';

type DocWriteSplitProps = { direction: 'column' | 'row'; doc: DocSurfaceDoc };

/** How the two halves stand when the page is first asked for, and while nobody drags the line. */
const EVEN = 50;

/**
 * The markdown with the page it makes beside it, or under it when the panel is narrow. The page
 * is not a second document: it draws the text being typed, so what it shows is what will be on
 * disk once the pause is over, and the two halves are kept on the same part of it.
 */
export function DocWriteSplit({ direction, doc }: DocWriteSplitProps) {
    const messages = useMessages('docs');
    const editorRef = useRef<CodeEditorHandle>(null);
    const pageRef = useRef<HTMLDivElement>(null);
    const [split, setSplit] = useState(EVEN);
    const sync = useDocScrollSync({ editorRef, pageRef });

    return (
        <SplitPane
            className="h-full"
            direction={direction}
            label={messages('splitHandle')}
            onValueChange={setSplit}
            value={split}
        >
            <SplitHalf className="h-full min-h-0">
                <div
                    className="h-full min-h-0"
                    data-part="doc-code"
                    onPointerEnter={sync.code.onPointerEnter}
                    role="presentation"
                >
                    <DocEditor
                        label={doc.label}
                        modelKey={doc.modelKey}
                        onChange={doc.onChange}
                        onScroll={sync.code.onScroll}
                        ref={editorRef}
                        value={doc.value}
                    />
                </div>
            </SplitHalf>
            <SplitHalf className="h-full min-h-0">
                <div
                    className="h-full min-h-0"
                    data-part="doc-beside"
                    onPointerEnter={sync.page.onPointerEnter}
                    role="presentation"
                >
                    <DocPage
                        onScroll={sync.page.onScroll}
                        onTask={(index) => {
                            doc.onChange(toggledTask(doc.value, index));
                        }}
                        pageRef={pageRef}
                        value={doc.value}
                    />
                </div>
            </SplitHalf>
        </SplitPane>
    );
}
