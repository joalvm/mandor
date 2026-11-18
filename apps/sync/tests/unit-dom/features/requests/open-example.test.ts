import { exampleResource } from '@mandor/collections';
import { ROOT_GROUP_ID } from '@mandor/ipc';
import { selectGroupOfTab, selectTabs, shellStore } from '@mandor/shell';
import { beforeEach, describe, expect, it } from 'vitest';

import {
    EXAMPLE_TAB_KIND,
    openExample,
} from '../../../../src/renderer/features/requests/lib/open-example.js';

const RESOURCE = exampleResource('Local', 'local', 'crear-pedido', 'Creado');

describe('opening an example', () => {
    beforeEach(() => {
        shellStore.getState().reset();
    });

    it('opens a tab of the kind of the examples on the resource', () => {
        openExample(RESOURCE, { beside: false, preview: true });

        expect(selectTabs(shellStore.getState())).toMatchObject([
            { kind: EXAMPLE_TAB_KIND, resource: RESOURCE },
        ]);
    });

    it('brings forward the tab that followed the example through a rename', () => {
        const renamed = exampleResource('Local', 'local', 'crear-pedido', 'Alta');

        openExample(RESOURCE, { beside: false, preview: false });
        shellStore.getState().moveResource(RESOURCE, renamed);
        openExample(renamed, { beside: false, preview: false });

        expect(selectTabs(shellStore.getState())).toHaveLength(1);
    });

    it('opens in the focused group, and beside it when asked', () => {
        openExample(RESOURCE, { beside: false, preview: false });

        const id = `${EXAMPLE_TAB_KIND}-${RESOURCE}`;

        expect(selectGroupOfTab(shellStore.getState(), id)).toBe(ROOT_GROUP_ID);

        shellStore.getState().reset();
        openExample(RESOURCE, { beside: true, preview: false });

        expect(selectGroupOfTab(shellStore.getState(), id)).not.toBe(ROOT_GROUP_ID);
    });
});
