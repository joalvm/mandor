import { createFakeBridge } from '@mandor/ipc/testing';
import { leavesOf, ROOT_GROUP_ID } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { GROUP_COMMANDS } from '../../src/command/group-commands.js';
import { createShellStore, type ShellStoreApi } from '../../src/shell-store.js';

function find(id: string) {
    const command = GROUP_COMMANDS.find((each) => each.id === id);

    expect(command, `command ${id} is declared`).toBeDefined();

    return command;
}

function applies(api: ShellStoreApi, id: string): boolean {
    return find(id)?.when?.(api.getState()) ?? true;
}

function run(api: ShellStoreApi, id: string): void {
    find(id)?.run(api.getState());
}

function groupIds(api: ShellStoreApi): string[] {
    return leavesOf(api.getState().grid).map((leaf) => leaf.id);
}

describe('the commands on the groups of the window', () => {
    it('declares focus commands for the places the digit row reaches, each with its place', () => {
        const focus = GROUP_COMMANDS.filter((command) => command.id.startsWith('group.focus.'));

        expect(focus.map((command) => command.id)).toEqual(
            Array.from({ length: 9 }, (_unused, index) => `group.focus.${String(index + 1)}`),
        );
        expect(focus.map((command) => command.titleValues)).toEqual(
            Array.from({ length: 9 }, (_unused, index) => ({ index: index + 1 })),
        );
    });

    it('offers a focus command only while the window has that many groups', () => {
        const api = createShellStore(createFakeBridge());

        expect(applies(api, 'group.focus.1')).toBe(true);
        expect(applies(api, 'group.focus.2')).toBe(false);

        run(api, 'group.splitRight');

        expect(applies(api, 'group.focus.2')).toBe(true);
        expect(applies(api, 'group.focus.3')).toBe(false);
    });

    it('moves the focus to the group at the place the command names', () => {
        const api = createShellStore(createFakeBridge());

        run(api, 'group.splitDown');
        run(api, 'group.focus.1');

        expect(api.getState().activeGroupId).toBe(ROOT_GROUP_ID);

        run(api, 'group.focus.2');

        expect(api.getState().activeGroupId).toBe(groupIds(api)[1]);
    });

    it('splits the focused group to the right as a row and downward as a column', () => {
        const api = createShellStore(createFakeBridge());

        run(api, 'group.splitRight');

        expect(api.getState().grid).toMatchObject({ axis: 'row', kind: 'branch' });

        run(api, 'group.splitDown');

        expect(groupIds(api)).toHaveLength(3);
    });

    it('closes the group and maximises it only when there is another one to see', async () => {
        const api = createShellStore(createFakeBridge());

        expect(applies(api, 'group.close')).toBe(false);
        expect(applies(api, 'group.toggleMaximized')).toBe(false);

        run(api, 'group.splitRight');
        run(api, 'group.toggleMaximized');

        expect(applies(api, 'group.close')).toBe(true);
        expect(api.getState().maximizedGroupId).toBe(ROOT_GROUP_ID);

        run(api, 'group.close');
        await expect.poll(() => groupIds(api)).toHaveLength(1);
    });
});
