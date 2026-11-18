import { fireAndForget, useTab } from '@mandor/shell';
import { useEffect } from 'react';
import { useStore } from 'zustand';

import { docsStore } from '../../docs-store.js';
import { DocPage } from '../view/DocPage.js';
import { loadDocText } from '../../lib/load-doc-text.js';

/**
 * The doc as it will be read, in a tab of its own. It shows the text of the store and not the
 * file, so what it draws is what has been typed, whether or not the pause has written it yet.
 */
export function DocPreviewTab() {
    const { resource } = useTab();
    const text = useStore(docsStore, (state) => state.texts[resource]);

    useEffect(() => {
        fireAndForget(loadDocText(resource));
    }, [resource]);

    return (
        <div className="h-full min-h-0" data-part="doc-preview-tab">
            <DocPreviewPage text={text} />
        </div>
    );
}

function DocPreviewPage({ text }: { text: string | undefined }) {
    if (text === undefined) {
        return null;
    }

    return <DocPage value={text} />;
}
