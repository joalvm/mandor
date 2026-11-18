import type { Translator } from '@mandor/i18n';

import { tabKind } from './tab-kind-registry.js';
import type { Tab } from './tab.js';

/**
 * What a tab shows when its kind has no name to give it: the thing is not read yet, or has none.
 * Never the resource nor the id inside it, which are the window's business and not the person's.
 */
export function shownTitle(title: string | null, translate: Translator): string {
    if (title === null) {
        return '';
    }

    return title === '' ? translate('shell:untitled') : title;
}

/** The title a tab shows, said by its kind; a tab of a kind nobody declared shows no name. */
export function tabTitleOf(tab: Tab, translate: Translator): string {
    return shownTitle(tabKind(tab.kind)?.title(tab.resource, translate) ?? '', translate);
}
