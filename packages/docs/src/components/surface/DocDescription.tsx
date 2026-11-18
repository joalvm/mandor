import { useState } from 'react';

import type { DocSurfaceView } from '../../doc-view-state.js';
import { DocSurface } from './DocSurface.js';

type DocDescriptionProps = {
    /** The name of the editor, read where it is drawn: this package holds no text of its own. */
    label: string;
    /** The item and not the panel, so the same item opened twice is one text and one undo. */
    modelKey: string;
    onChange: (text: string) => void;
    value: string;
};

/** A description is met as a page: it is read far more often than it is written. */
const READING: DocSurfaceView = { mode: 'read', preview: false };

/**
 * The description of an item, in the strip of the item: the same viewer, editor and page as a
 * doc of the workspace, with the same markdown. Which side is showing lasts while the item is on
 * screen, and the next item opens on its page.
 */
export function DocDescription({ label, modelKey, onChange, value }: DocDescriptionProps) {
    // Kept with the item it was chosen for: the strip stays mounted when the item changes.
    const [shown, setShown] = useState({ modelKey, view: READING });
    const view = shown.modelKey === modelKey ? shown.view : READING;

    return (
        <DocSurface
            doc={{ label, modelKey, onChange, place: modelKey, value }}
            onView={(patch) => {
                setShown({ modelKey, view: { ...view, ...patch } });
            }}
            view={view}
        />
    );
}
