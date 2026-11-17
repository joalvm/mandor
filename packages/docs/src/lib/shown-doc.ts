import type { ResourceUri } from '@mandor/schema';
import { selectActiveGroup, type ShellStore } from '@mandor/shell';

/** Both ways of looking at a doc. A command over one of them is a command over the file. */
const DOC_KINDS = ['doc', 'doc-preview'];

/**
 * The doc being read right now, whichever of its two tabs is in front. It answers `null` for
 * everything else, so the commands of a doc are only offered where there is one.
 */
export function shownDoc(state: ShellStore): ResourceUri | null {
    const group = selectActiveGroup(state);
    const tab = group?.tabs.find((each) => each.id === group.activeTab);

    if (tab === undefined || !DOC_KINDS.includes(tab.kind)) {
        return null;
    }

    return tab.resource;
}
