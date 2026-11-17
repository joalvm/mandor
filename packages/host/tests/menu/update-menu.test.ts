import { createPlainI18n } from '@mandor/i18n';
import type { UpdateState } from '@mandor/ipc';
import type { MenuItemConstructorOptions } from 'electron';
import { describe, expect, it, vi } from 'vitest';

import { helpEntries, updateMenuKey, type UpdateMenu } from '../../src/menu/update-menu.js';

const t = createPlainI18n('en').t;

function menuWith(state: Partial<UpdateState>) {
    const run = vi.fn<UpdateMenu['run']>();
    const menu: UpdateMenu = {
        state: { phase: 'idle', support: 'full', current: '0.1.0', ...state },
        run,
    };

    return { menu, run };
}

/** A click, with what the menu would hand over left out: the entries read none of it. */
function press(entry: MenuItemConstructorOptions | undefined): void {
    (entry?.click as (() => void) | undefined)?.();
}

function labels(menu: UpdateMenu | undefined): (string | undefined)[] {
    return helpEntries(t, menu).map((entry) => entry.label);
}

describe('the entries of Help', () => {
    it('looks for a version when there is nothing to do, and keeps the release notes', () => {
        const { menu, run } = menuWith({});
        const [look, notes] = helpEntries(t, menu);

        expect(labels(menu)).toEqual(['Check for updates…', 'Release notes']);

        press(look);
        press(notes);

        expect(run.mock.calls).toEqual([['check'], ['openPage']]);
    });

    it('follows the update from the version found to the restart', () => {
        const next = { version: '0.2.0' };

        expect(labels(menuWith({ phase: 'checking' }).menu)[0]).toBe('Checking for updates…');
        expect(labels(menuWith({ phase: 'available', next }).menu)[0]).toBe(
            'Download update 0.2.0',
        );
        expect(labels(menuWith({ phase: 'downloading', next }).menu)[0]).toBe(
            'Downloading update…',
        );
        expect(labels(menuWith({ phase: 'ready', next }).menu)[0]).toBe('Restart to update');
    });

    it('asks for the download, and for the restart, and for nothing while it waits', () => {
        const next = { version: '0.2.0' };
        const available = menuWith({ phase: 'available', next });
        const ready = menuWith({ phase: 'ready', next });
        const busy = helpEntries(t, menuWith({ phase: 'checking' }).menu)[0];

        press(helpEntries(t, available.menu)[0]);
        press(helpEntries(t, ready.menu)[0]);

        expect(available.run).toHaveBeenCalledWith('download');
        expect(ready.run).toHaveBeenCalledWith('install');
        expect(busy?.enabled).toBe(false);
    });

    it('sends an install that cannot update by itself to the page, not to a download', () => {
        const { menu, run } = menuWith({
            phase: 'available',
            support: 'manual-only',
            next: { version: '0.2.0' },
        });
        const [entry] = helpEntries(t, menu);

        expect(entry?.label).toBe('Get version 0.2.0');

        press(entry);

        expect(run).toHaveBeenCalledWith('openPage');
    });

    it('offers no update entry where the install cannot update, or before main says so', () => {
        expect(labels(menuWith({ support: 'unsupported' }).menu)).toEqual(['Release notes']);
        expect(labels(undefined)).toEqual(['Release notes']);
        expect(helpEntries(t, undefined)[0]?.enabled).toBe(false);
    });
});

describe('the key a rebuild of the menu hangs from', () => {
    it('ignores the progress of a download and tells every change an entry shows', () => {
        const base = menuWith({ phase: 'downloading', next: { version: '0.2.0' } }).menu;
        const further = menuWith({
            phase: 'downloading',
            next: { version: '0.2.0' },
            progress: 80,
        });
        const ready = menuWith({ phase: 'ready', next: { version: '0.2.0' } }).menu;

        expect(updateMenuKey(further.menu)).toBe(updateMenuKey(base));
        expect(updateMenuKey(ready)).not.toBe(updateMenuKey(base));
        expect(updateMenuKey(undefined)).toBe('');
    });
});
