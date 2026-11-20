import { EyeIcon } from '@mandor/icons';
import { useMessages } from '@mandor/i18n';
import { isApplePlatform, shortcutLabel } from '@mandor/shell';
import { Button, IconButton } from '@mandor/ui';
import { useRef } from 'react';

import type { DocSide } from '../../doc-view-state.js';
import { usePreviewChord } from '../../hooks/usePreviewChord.js';
import { DocEditor } from '../editor/DocEditor.js';
import { DocBand } from './DocBand.js';
import { DocWriteSplit } from './DocWriteSplit.js';

type DocWriteProps = DocSide;

/** The chord the editor opens the preview with, the one VS Code gives it. */
const PREVIEW_CHORD = '$mod+KeyK KeyV';

/**
 * The doc written as markdown, in the code editor, on its own or with the page it makes beside
 * it, the way VS Code opens the preview of a `.md`: from the band or with `Ctrl+K V`. Every key is
 * already kept, so going back to the viewer has nothing to confirm.
 *
 * View is the last button of the band and Edit the only one of the viewer, so the way across sits
 * in the same place on both sides and is aimed at from memory.
 */
export function DocWrite({ doc, onView, view }: DocWriteProps) {
    const messages = useMessages('docs');
    const box = useRef<HTMLDivElement>(null);
    const togglePreview = (): void => {
        onView({ preview: !view.preview });
    };

    usePreviewChord(box, togglePreview);

    return (
        <div className="flex h-full min-h-0 flex-col" data-part="doc-write" ref={box}>
            <DocBand>
                <IconButton
                    active={view.preview}
                    icon="preview"
                    label={messages(view.preview ? 'previewClose' : 'previewOpen', {
                        keys: shortcutLabel(PREVIEW_CHORD, isApplePlatform()),
                    })}
                    onClick={togglePreview}
                    size="sm"
                />
                <Button
                    onClick={() => {
                        onView({ mode: 'read' });
                    }}
                    size="sm"
                    variant="ghost"
                >
                    <EyeIcon size="sm" />
                    {messages('read')}
                </Button>
            </DocBand>
            <div className="min-h-0 flex-1" data-part="doc-body">
                <DocWriteBody doc={doc} preview={view.preview} />
            </div>
        </div>
    );
}

function DocWriteBody({ doc, preview }: { doc: DocWriteProps['doc']; preview: boolean }) {
    if (preview) {
        return <DocWriteSplit doc={doc} />;
    }

    return (
        <DocEditor
            label={doc.label}
            modelKey={doc.modelKey}
            onChange={doc.onChange}
            value={doc.value}
        />
    );
}
