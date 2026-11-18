import { describe, expect, it, vi } from 'vitest';

import { keyIntent } from '../../../../src/renderer/features/requests/lib/send-shortcut.js';

/** What the panel asked for, under the keys pressed; and whether the browser kept its own. */
function intentOf(keys: { ctrlKey?: boolean; key: string; metaKey?: boolean }) {
    const actions = { save: vi.fn(), send: vi.fn() };
    const preventDefault = vi.fn();

    keyIntent({ ctrlKey: false, metaKey: false, ...keys, preventDefault }, actions);

    return {
        prevented: preventDefault.mock.calls.length > 0,
        saved: actions.save.mock.calls.length,
        sent: actions.send.mock.calls.length,
    };
}

describe('the keys of the panel of a request', () => {
    it('send with Enter and Ctrl, or with Cmd', () => {
        expect(intentOf({ ctrlKey: true, key: 'Enter' })).toEqual({
            prevented: true,
            saved: 0,
            sent: 1,
        });
        expect(intentOf({ key: 'Enter', metaKey: true })).toMatchObject({ sent: 1 });
    });

    it('leave a plain Enter to the field, which keeps it for itself', () => {
        expect(intentOf({ key: 'Enter' })).toEqual({ prevented: false, saved: 0, sent: 0 });
    });

    it('save with S and Ctrl, or with Cmd, and the browser does not offer to save the page', () => {
        expect(intentOf({ ctrlKey: true, key: 's' })).toEqual({
            prevented: true,
            saved: 1,
            sent: 0,
        });
        expect(intentOf({ key: 'S', metaKey: true })).toMatchObject({ saved: 1 });
    });
});
