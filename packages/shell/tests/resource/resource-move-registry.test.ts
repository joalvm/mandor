import { createFakeBridge } from '@mandor/ipc/testing';
import { describe, expect, it, vi } from 'vitest';

import { registerResourceMove } from '../../src/index.js';
import { createShellStore } from '../../src/shell-store.js';

const NOTES = 'mandor://demo/payments/doc/notas.md';
const RENAMED = 'mandor://demo/payments/doc/notas-de-la-api.md';

/**
 * A rename on disk is news of the window, not of the layout alone: the tabs follow the file by
 * themselves, and whatever else was filed under the old name — a composer holding the event, a
 * buffer of what arrived through it — hears the same sentence and follows too.
 */
describe('news that a resource moved', () => {
    it('reaches whoever asked to hear it when the window moves a resource', () => {
        const heard = vi.fn();
        const off = registerResourceMove(heard);
        const api = createShellStore(createFakeBridge());

        api.getState().moveResource(NOTES, RENAMED);
        off();

        expect(heard).toHaveBeenCalledWith(NOTES, RENAMED);
    });

    it('stops reaching a listener that let its registration go', () => {
        const heard = vi.fn();

        registerResourceMove(heard)();

        const api = createShellStore(createFakeBridge());

        api.getState().moveResource(NOTES, RENAMED);

        expect(heard).not.toHaveBeenCalled();
    });

    it('reaches every listener, so two features can follow the same move', () => {
        const first = vi.fn();
        const second = vi.fn();
        const offFirst = registerResourceMove(first);
        const offSecond = registerResourceMove(second);
        const api = createShellStore(createFakeBridge());

        api.getState().moveResource(NOTES, RENAMED);
        offFirst();
        offSecond();

        expect(first).toHaveBeenCalledWith(NOTES, RENAMED);
        expect(second).toHaveBeenCalledWith(NOTES, RENAMED);
    });
});
