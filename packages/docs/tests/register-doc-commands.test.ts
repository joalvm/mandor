import { failure, success } from '@mandor/ipc';
import { availableCommands, bridge, shellStore, type Command } from '@mandor/shell';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { docsStore } from '../src/docs-store.js';
import { registerDocCommands } from '../src/register-doc-commands.js';

import { flush } from './support/flush.js';

const README = 'mandor://local-apis/events/doc/readme.md';
const COMMITTED = '# Lo que había\n';

function showTab(kind: string, resource: string): void {
    const shell = shellStore.getState();

    shell.openTab(shell.activeGroupId, { id: `${kind}-1`, kind, resource });
    shellStore.getState().setActiveTab(shell.activeGroupId, `${kind}-1`);
}

function commandOf(id: string): Command | undefined {
    return availableCommands(shellStore.getState()).find((command) => command.id === id);
}

let unregister: () => void = () => undefined;
const onFailure = vi.fn();

beforeEach(() => {
    vi.restoreAllMocks();
    onFailure.mockReset();
    shellStore.getState().reset();
    docsStore.getState().reset();
    unregister = registerDocCommands(onFailure);
});

afterEach(() => {
    unregister();
    shellStore.getState().reset();
});

describe('registering the commands of a doc', () => {
    it('offers both commands over the doc in front', () => {
        showTab('doc', README);

        expect(commandOf('doc.preview')).toBeDefined();
        expect(commandOf('doc.revert')).toBeDefined();
    });

    it('offers neither where no doc is being read', () => {
        showTab('connection', 'mandor://local-apis/events/connection/ws-echo');

        expect(commandOf('doc.preview')).toBeUndefined();
        expect(commandOf('doc.revert')).toBeUndefined();
    });

    it('takes both away when it is undone', () => {
        showTab('doc', README);
        unregister();

        expect(commandOf('doc.preview')).toBeUndefined();
        expect(commandOf('doc.revert')).toBeUndefined();
    });

    it('opens the preview of the doc in front when the command runs', () => {
        showTab('doc', README);
        commandOf('doc.preview')?.run(shellStore.getState());

        const kinds = shellStore.getState().grid;

        expect(JSON.stringify(kinds)).toContain('doc-preview');
    });

    it('puts the doc back to its last commit when the revert runs, and tells nobody', async () => {
        vi.spyOn(bridge.doc, 'revert').mockResolvedValue(success(COMMITTED));
        showTab('doc', README);

        commandOf('doc.revert')?.run(shellStore.getState());
        await flush();

        expect(docsStore.getState().texts[README]).toBe(COMMITTED);
        expect(onFailure).not.toHaveBeenCalled();
    });

    it('hands the code of a refused revert to whoever draws the notices', async () => {
        vi.spyOn(bridge.doc, 'revert').mockResolvedValue(failure('fs-read', 'no history'));
        showTab('doc', README);

        commandOf('doc.revert')?.run(shellStore.getState());
        await flush();

        expect(onFailure).toHaveBeenCalledWith('fs-read');
    });
});
