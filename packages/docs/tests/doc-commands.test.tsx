import { failure, success } from '@mandor/ipc';
import { availableCommands, bridge, type Command, selectTabs, shellStore } from '@mandor/shell';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DocCommands } from '../src/index.js';
import { docsStore } from '../src/docs-store.js';
import { scheduleDocWrite } from '../src/lib/pending-doc-write.js';

import { AppProviders } from './support/app-providers.js';
import { flush } from './support/flush.js';

const README = 'mandor://local-apis/events/doc/readme.md';
const CONNECTION = 'mandor://local-apis/events/connection/ws-echo';
const COMMITTED = '# Lo que había\n';

/** Longer than the pause the writer waits for, so the timer has certainly gone off. */
const AFTER_THE_PAUSE = 2000;

function showTab(kind: string, resource: string): void {
    const shell = shellStore.getState();

    shell.openTab(shell.activeGroupId, { id: `${kind}-1`, kind, resource });
    shellStore.getState().setActiveTab(shell.activeGroupId, `${kind}-1`);
}

function commandOf(id: string): Command | undefined {
    return availableCommands(shellStore.getState()).find((command) => command.id === id);
}

function run(id: string): void {
    commandOf(id)?.run(shellStore.getState());
}

beforeEach(() => {
    vi.restoreAllMocks();
    shellStore.getState().reset();
    docsStore.getState().reset();
    render(<DocCommands />, { wrapper: AppProviders });
});

afterEach(() => {
    vi.useRealTimers();
});

describe('the commands of a doc', () => {
    /** The palette lists what can be chosen, so a doc command is not offered over a connection. */
    it('offers itself only where a doc is being read', () => {
        showTab('connection', CONNECTION);

        expect(commandOf('doc.revert')).toBeUndefined();

        showTab('doc', README);

        expect(commandOf('doc.revert')).toBeDefined();
    });

    /** The preview answers to the file, so it is reachable from the preview as well. */
    it('opens a preview of the doc in front', () => {
        showTab('doc', README);
        run('doc.preview');

        const opened = selectTabs(shellStore.getState()).filter(
            (tab) => tab.kind === 'doc-preview',
        );

        expect(opened).toHaveLength(1);
        expect(opened[0]?.resource).toBe(README);
    });

    it('puts the doc back to what its last commit says', async () => {
        vi.spyOn(bridge.doc, 'revert').mockResolvedValue(success(COMMITTED));
        docsStore.getState().setText(README, '# Un desastre\n');
        showTab('doc', README);
        run('doc.revert');
        await flush();

        expect(docsStore.getState().texts[README]).toBe(COMMITTED);
    });

    /** A write still waiting for its pause would put the undone text straight back on disk. */
    it('drops the write that had not gone out when the doc goes back', async () => {
        vi.useFakeTimers();

        const write = vi.spyOn(bridge.doc, 'write').mockResolvedValue(success({}));

        vi.spyOn(bridge.doc, 'revert').mockResolvedValue(success(COMMITTED));
        scheduleDocWrite(README, '# Un desastre\n', vi.fn());
        showTab('doc', README);
        run('doc.revert');
        await vi.advanceTimersByTimeAsync(AFTER_THE_PAUSE);

        expect(write).not.toHaveBeenCalled();
    });

    /** Reverting is something the reader asked for, so its failure is told where they are. */
    it('says so where the reader is looking when the revert fails', async () => {
        vi.spyOn(bridge.doc, 'revert').mockResolvedValue(failure('fs-read', 'no history'));
        showTab('doc', README);
        run('doc.revert');
        await flush();

        expect(screen.getByText('Mandor could not read the requested file.')).toBeVisible();
    });
});
