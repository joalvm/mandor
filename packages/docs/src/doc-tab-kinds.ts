import type { Translator } from '@mandor/i18n';

import { docsStore } from './docs-store.js';
import { docNameOf } from './lib/doc-resource.js';
import { forgetDocTop } from './lib/doc-scroll-memory.js';

/**
 * It reads the title the doc carries, as the row of the list does, so the tab and the row call
 * the same doc the same thing. Until the list of the workspace has landed there is no title to
 * read, and the tab draws nothing for that moment. A doc the list does not hold has no name, and
 * the strip draws the word it keeps for that: the last segment of the resource is a file, and no
 * file is ever drawn.
 */
export function docTabTitle(resource: string): string | null {
    const { docs, listed } = docsStore.getState();

    if (!listed) {
        return null;
    }

    const name = docNameOf(resource);

    return docs.find((doc) => doc.name === name)?.title ?? '';
}

/** The titles of the doc tabs follow the list: a rename, or the list landing, shows at once. */
export function subscribeDocTitles(onChange: () => void): () => void {
    return docsStore.subscribe(onChange);
}

/** The preview is named after the doc it shows, so the two tabs of one doc read as a pair. */
export function docPreviewTitle(resource: string, translate: Translator): string | null {
    const title = docTabTitle(resource);

    if (title === null) {
        return null;
    }

    return translate('docs:previewTitle', {
        name: title === '' ? translate('shell:untitled') : title,
    });
}

/**
 * What a tab lets go of on the way out is how it was showing the file — which side, one pane or
 * two, where the page was scrolled to. The text goes with the last tab on the file, which is the
 * only moment this runs for it, and the next tab reads the file again.
 */
export function releaseDoc(tabId: string, resource: string): void {
    docsStore.getState().releaseView(tabId);
    docsStore.getState().forgetText(resource);
    forgetDocTop(tabId);
}
