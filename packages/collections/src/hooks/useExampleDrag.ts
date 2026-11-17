import { draggable } from '@atlaskit/pragmatic-drag-and-drop/adapter/element-adapter';
import { useEffect } from 'react';

import { dataOfCarriedExample, type CarriedExample } from '../lib/example-drop.js';

/** The row of an example as something to take; the item it is let go on writes the move. */
export function useExampleDrag(element: HTMLElement | null, carried: CarriedExample): void {
    const { fromPath, itemKind, resource } = carried;

    useEffect(() => {
        if (element === null) {
            return undefined;
        }

        return draggable({
            element,
            getInitialData: () => dataOfCarriedExample({ fromPath, itemKind, resource }),
        });
    }, [element, fromPath, itemKind, resource]);
}
