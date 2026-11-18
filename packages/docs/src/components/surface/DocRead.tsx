import { EditIcon } from '@mandor/icons';
import { useMessages } from '@mandor/i18n';
import { Button } from '@mandor/ui';

import type { DocSide } from '../../doc-view-state.js';
import { DocBand } from './DocBand.js';
import { DocEmpty } from './DocEmpty.js';
import { DocReadPage } from './DocReadPage.js';

type DocReadProps = DocSide;

/**
 * The viewer: the way into a doc. It is read, its boxes are ticked and its links are followed;
 * writing it is a step of its own, behind the one button of the band.
 */
export function DocRead({ doc, onView }: DocReadProps) {
    const messages = useMessages('docs');
    const write = (): void => {
        onView({ mode: 'write' });
    };

    return (
        <div className="flex h-full min-h-0 flex-col" data-part="doc-read">
            <DocBand>
                <Button onClick={write} size="sm" variant="ghost">
                    <EditIcon size="sm" />
                    {messages('write')}
                </Button>
            </DocBand>
            <div className="min-h-0 flex-1" data-part="doc-body">
                <DocReadBody doc={doc} onWrite={write} />
            </div>
        </div>
    );
}

function DocReadBody({ doc, onWrite }: { doc: DocReadProps['doc']; onWrite: () => void }) {
    if (doc.value.trim() === '') {
        return <DocEmpty onWrite={onWrite} />;
    }

    return <DocReadPage doc={doc} />;
}
