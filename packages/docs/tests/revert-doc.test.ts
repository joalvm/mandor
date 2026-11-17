import { failure, success } from '@mandor/ipc';
import { bridge } from '@mandor/shell';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { docsStore } from '../src/docs-store.js';
import { scheduleDocWrite } from '../src/lib/pending-doc-write.js';
import { revertDoc } from '../src/lib/revert-doc.js';

const README = 'mandor://local-apis/events/doc/readme.md';
const COMMITTED = '# Lo que había\n';

/** Longer than the pause the writer waits for, so the timer has certainly gone off. */
const AFTER_THE_PAUSE = 2000;

beforeEach(() => {
    vi.restoreAllMocks();
    docsStore.getState().reset();
});

afterEach(() => {
    vi.useRealTimers();
});

describe('taking a doc back to its last commit', () => {
    it('asks main for the file of the workspace by its name', async () => {
        const revert = vi.spyOn(bridge.doc, 'revert').mockResolvedValue(success(COMMITTED));

        await revertDoc(README);

        expect(revert).toHaveBeenCalledWith({ workspaceId: 'events', name: 'readme.md' });
    });

    it('puts the committed text in the store and answers it', async () => {
        vi.spyOn(bridge.doc, 'revert').mockResolvedValue(success(COMMITTED));
        docsStore.getState().setText(README, '# Un desastre\n');

        const result = await revertDoc(README);

        expect(result).toEqual({ ok: true, value: COMMITTED });
        expect(docsStore.getState().texts[README]).toBe(COMMITTED);
    });

    it('leaves the text where it was when main refuses, and answers the refusal', async () => {
        vi.spyOn(bridge.doc, 'revert').mockResolvedValue(failure('fs-read', 'no history'));
        docsStore.getState().setText(README, '# Un desastre\n');

        const result = await revertDoc(README);

        expect(result.ok).toBe(false);
        expect(docsStore.getState().texts[README]).toBe('# Un desastre\n');
    });

    /** The pause still running would put the undone text straight back on disk. */
    it('drops the write that was waiting for its pause', async () => {
        vi.useFakeTimers();

        const write = vi.spyOn(bridge.doc, 'write').mockResolvedValue(success({}));

        vi.spyOn(bridge.doc, 'revert').mockResolvedValue(success(COMMITTED));
        scheduleDocWrite(README, '# Un desastre\n', vi.fn());

        await revertDoc(README);
        await vi.advanceTimersByTimeAsync(AFTER_THE_PAUSE);

        expect(write).not.toHaveBeenCalled();
    });
});
