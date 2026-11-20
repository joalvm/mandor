import { createFakeBridge } from '@mandor/ipc/testing';
import { describe, expect, it } from 'vitest';

import { createShellStore } from '../../src/shell-store.js';
import { revealInSidebar } from '../../src/sidebar/reveal-in-sidebar.js';

const RESOURCE = 'mandor://demo/payments/doc/a.md';

describe('revealing a row in the sidebar', () => {
    it('opens its section and asks the section to go to the row', () => {
        const api = createShellStore(createFakeBridge());

        api.getState().setPanels({ collapsedSections: ['docs', 'collections'] });
        revealInSidebar(api.getState(), 'docs', RESOURCE);

        expect(api.getState().panels.collapsedSections).toEqual(['collections']);
        expect(api.getState().revealing).toBe(RESOURCE);
    });

    it('leaves the other sections as they were', () => {
        const api = createShellStore(createFakeBridge());

        revealInSidebar(api.getState(), 'docs', RESOURCE);

        expect(api.getState().panels.collapsedSections).toEqual([]);
    });
});
