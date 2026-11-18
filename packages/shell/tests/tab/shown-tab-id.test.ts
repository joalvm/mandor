import { ROOT_GROUP_ID } from '@mandor/ipc';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { shellStore } from '../../src/shell-store.js';
import { shownTabId } from '../../src/tab/shown-tab-id.js';

const MOVED = 'mandor://local/events/item/nuevo/pedido.yaml';

function open(id: string, kind: string, resource: string): void {
    shellStore.getState().openTab(ROOT_GROUP_ID, { id, kind, resource });
}

beforeEach(() => {
    shellStore.getState().reset();
});

afterEach(() => {
    shellStore.getState().reset();
});

describe('the id a tab of a resource opens under', () => {
    it('is the derived one while nothing shows the resource', () => {
        expect(shownTabId('item', MOVED, 'derivado')).toBe('derivado');
    });

    it('is the id of the tab that shows it, born under another path', () => {
        open('nacida-antes', 'item', MOVED);

        expect(shownTabId('item', MOVED, 'derivado')).toBe('nacida-antes');
    });

    it('prefers the derived id when that very tab shows it', () => {
        open('otra', 'item', MOVED);
        open('derivado', 'item', MOVED);

        expect(shownTabId('item', MOVED, 'derivado')).toBe('derivado');
    });

    it('does not take a tab of another kind on the same resource', () => {
        open('vista', 'preview', MOVED);

        expect(shownTabId('item', MOVED, 'derivado')).toBe('derivado');
    });
});
