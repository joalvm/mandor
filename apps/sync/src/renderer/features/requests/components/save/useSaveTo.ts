import { collectionStore } from '@mandor/collections';
import { useMessages } from '@mandor/i18n';
import { fireAndForget, useFailureToast } from '@mandor/shell';
import { useRef, useState } from 'react';
import { useStore } from 'zustand';

import { folderLines, type FolderLine } from '../../lib/folder-lines.js';
import { looseBecomesItem } from '../../lib/loose-becomes-item.js';
import { loosePartsOf } from '../../lib/loose-resource.js';
import { makePlace } from '../../lib/make-place.js';
import { saveLooseRequest } from '../../lib/save-loose-request.js';
import { requestsStore } from '../../requests-store.js';
import { saveToQuestion, type SaveToAsking } from '../../save-to-question.js';

type SaveTo = {
    cancel: () => void;
    fold: (id: string, expanded: boolean) => void;
    lines: FolderLine[];
    name: string;
    newCollection: () => void;
    newFolder: () => void;
    /** The collection or folder the request goes into; nothing while the workspace has none. */
    place: string | null;
    save: () => void;
    setName: (name: string) => void;
    setPlace: (place: string) => void;
};

const NOTHING_FOLDED: ReadonlySet<string> = new Set();

function foldedAfter(folded: ReadonlySet<string>, id: string, expanded: boolean): Set<string> {
    const next = new Set(folded);

    if (expanded) {
        next.delete(id);
    } else {
        next.add(id);
    }

    return next;
}

/**
 * What the question «Save to…» holds while it is asked: the name, the place chosen in the tree
 * and what is folded there. A new collection or folder is made at once under its word, inside
 * the place chosen, and becomes the place. Saving with nowhere to go makes a collection first:
 * nothing waits for the person to make one. A press while another is on its way is ignored.
 */
export function useSaveTo(asking: SaveToAsking): SaveTo {
    const words = useMessages('collections');
    const notifyFailure = useFailureToast();
    const nodes = useStore(collectionStore, (state) => state.nodes);
    const [name, setName] = useState(
        () => requestsStore.getState().requests[asking.resource]?.name ?? '',
    );
    const [folded, setFolded] = useState(NOTHING_FOLDED);
    const [place, setPlace] = useState(() => folderLines(nodes, NOTHING_FOLDED)[0]?.id ?? null);
    const working = useRef(false);
    const workspaceId = loosePartsOf(asking.resource)?.workspaceId;

    async function make(parent: string, word: string): Promise<string | null> {
        if (workspaceId === undefined) {
            return null;
        }

        const made = await makePlace(workspaceId, parent, word);

        if (!made.ok) {
            notifyFailure(made.error.code);

            return null;
        }

        setFolded((current) => foldedAfter(current, parent, true));
        setPlace(made.value);

        return made.value;
    }

    async function saveThere(): Promise<void> {
        const parent = place ?? (await make('', words('newCollection')));

        if (parent === null) {
            return;
        }

        const saved = await saveLooseRequest({ name, parent, resource: asking.resource });

        if (!saved.ok) {
            notifyFailure(saved.error.code);

            return;
        }

        if (asking.reopen) {
            looseBecomesItem(asking.resource, saved.value);
        }

        saveToQuestion.getState().answer(true);
    }

    /** One press at a time: what is still on its way answers before the next one goes. */
    function once(work: () => Promise<unknown>): void {
        if (working.current) {
            return;
        }

        working.current = true;
        fireAndForget(
            work().finally(() => {
                working.current = false;
            }),
        );
    }

    return {
        cancel: () => {
            saveToQuestion.getState().answer(false);
        },
        fold: (id, expanded) => {
            setFolded((current) => foldedAfter(current, id, expanded));
        },
        lines: folderLines(nodes, folded),
        name,
        newCollection: () => {
            once(() => make('', words('newCollection')));
        },
        newFolder: () => {
            once(() => make(place ?? '', words('newFolder')));
        },
        place,
        save: () => {
            once(saveThere);
        },
        setName,
        setPlace,
    };
}
