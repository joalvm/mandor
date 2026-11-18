import { describe, expect, it, vi } from 'vitest';

import { tabOpened, type Layout } from '../../src/grid/grid-changes.js';
import { moveResourceFor } from '../../src/resource/resource-move-action.js';
import { registerResourceMove } from '../../src/resource/resource-move-registry.js';
import { initialLayout } from '../../src/ui.slice.js';

const FROM = 'mandor://demo/events/item/mensajes/saludo';
const TO = 'mandor://demo/events/item/mensajes/saludo-cordial';

function layoutWithTab(resource: string): Layout {
    const layout = initialLayout();

    return tabOpened(layout, layout.activeGroupId, { id: 'saludo', kind: 'item', resource });
}

describe('moving a resource of the window', () => {
    it('leaves the tabs of the window filed under the name the resource has now', () => {
        let layout = layoutWithTab(FROM);
        const relaid = (change: (current: Layout) => Layout): void => {
            layout = change(layout);
        };

        moveResourceFor(relaid)(FROM, TO);

        expect(Object.keys(layout.resources)).toEqual([TO]);
    });

    /** A tab that followed the file while a panel kept the old name is the bug this prevents. */
    it('tells whoever else filed something under the old name', () => {
        const listener = vi.fn();
        const release = registerResourceMove(listener);

        moveResourceFor(() => undefined)(FROM, TO);
        release();

        expect(listener).toHaveBeenCalledWith(FROM, TO);
    });
});
