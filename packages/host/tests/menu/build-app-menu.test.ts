import { describe, expect, it } from 'vitest';

import { buildAppMenu } from '../../src/menu/build-app-menu.js';

type MenuEntry = {
    accelerator?: string;
    click?: (item: unknown, window: unknown, event: unknown) => void;
    label?: string;
    role?: string;
    type?: string;
};

function submenuOf(template: ReturnType<typeof buildAppMenu>, label: string) {
    const item = template.find((each) => each.label === label);

    expect(item, `menu ${label} is missing`).toBeDefined();

    return (item?.submenu ?? []) as MenuEntry[];
}

describe('the application menu template', () => {
    it('names the product the menu belongs to, and only where the system shows the bar', () => {
        const mac = buildAppMenu('Mandor Realtime', 'en', 'darwin');

        expect(mac[0]?.label).toBe('Mandor Realtime');
        expect(buildAppMenu('Mandor Request', 'en', 'darwin')[0]?.label).toBe('Mandor Request');
        expect(
            buildAppMenu('Mandor Realtime', 'en', 'win32').some(
                (each) => each.label === 'Mandor Realtime',
            ),
        ).toBe(false);
    });

    /**
     * Every label is written by the app, never taken from the role: the menu speaks the
     * language of the interface, and Electron's defaults speak English only.
     */
    it('labels every item in the language of the interface', () => {
        for (const item of buildAppMenu('Mandor Realtime', 'en', 'win32')) {
            expect(item.label).not.toBeUndefined();
        }
    });

    it('carries the clipboard in Edit and the developer tools in View', () => {
        const edit = submenuOf(buildAppMenu('Mandor Realtime', 'en', 'win32'), 'Edit');
        const view = submenuOf(buildAppMenu('Mandor Realtime', 'en', 'win32'), 'View');
        const shape = (items: { role?: string; type?: string }[]) =>
            items.map((each) => each.type ?? each.role);

        expect(shape(edit)).toEqual([
            undefined,
            undefined,
            'separator',
            'cut',
            'copy',
            'paste',
            'selectAll',
        ]);
        expect(edit.slice(0, 2).map((each) => each.label)).toEqual(['Undo', 'Redo']);
        expect(shape(view)).toContain('toggleDevTools');
    });

    /**
     * The history of a document lives in the editor that holds it, and the browser's own undo
     * knows nothing of it: the menu hands the window the step and the window takes it.
     */
    it('hands the window the step of the history, instead of the browser its own', () => {
        const edit = submenuOf(buildAppMenu('Mandor Realtime', 'en', 'win32'), 'Edit');
        const sent: { channel: string; message: unknown }[] = [];
        const window = {
            isDestroyed: () => false,
            webContents: {
                send: (channel: string, message: unknown) => sent.push({ channel, message }),
            },
        };

        edit[0]?.click?.(undefined, window, undefined);
        edit[1]?.click?.(undefined, window, undefined);

        expect(sent).toEqual([
            { channel: 'menu:edit', message: { step: 'undo' } },
            { channel: 'menu:edit', message: { step: 'redo' } },
        ]);
        expect(edit.slice(0, 2).map((each) => each.accelerator)).toEqual([
            'CmdOrCtrl+Z',
            'Shift+CmdOrCtrl+Z',
        ]);
    });

    /** A window that is gone throws inside Electron, and the menu outlives no window. */
    it('says nothing when the click found no window', () => {
        const edit = submenuOf(buildAppMenu('Mandor Realtime', 'en', 'win32'), 'Edit');

        expect(() => edit[0]?.click?.(undefined, undefined, undefined)).not.toThrow();
    });

    /**
     * The product submenu is the menu bar macOS draws; everywhere else the button already
     * opens the product's own menu, and repeating the product's name as the first entry of
     * its own menu says nothing.
     */
    it('quits from the product submenu on macOS and from File everywhere else, never both', () => {
        const mac = buildAppMenu('Mandor Realtime', 'en', 'darwin');
        const windows = buildAppMenu('Mandor Realtime', 'en', 'win32');
        const shape = (items: { role?: string; type?: string }[]) =>
            items.map((each) => each.type ?? each.role);

        expect(shape(submenuOf(mac, 'Mandor Realtime'))).toEqual([
            'about',
            'separator',
            undefined,
            'separator',
            'quit',
        ]);
        expect(shape(submenuOf(mac, 'File'))).toEqual(['close']);
        expect(shape(submenuOf(windows, 'File'))).toEqual([
            'close',
            'separator',
            undefined,
            'separator',
            'quit',
        ]);
    });

    /**
     * The window listens for Ctrl/Cmd+, itself (the menu is not always reachable, and an editor
     * has the focus), so the menu shows the keys and does not register them: registered too, one
     * press would open the dialog twice.
     */
    it('opens the settings from one entry per platform, which shows the keys without taking them', () => {
        const mac = submenuOf(buildAppMenu('Mandor Realtime', 'en', 'darwin'), 'Mandor Realtime');
        const windows = submenuOf(buildAppMenu('Mandor Realtime', 'es', 'win32'), 'Archivo');
        const entries = [
            mac.find((each) => each.label === 'Settings…'),
            windows.find((each) => each.label === 'Ajustes…'),
        ];

        for (const entry of entries) {
            expect(entry).toMatchObject({ accelerator: 'CmdOrCtrl+,', registerAccelerator: false });
        }
    });

    it('hands the window the click on Settings, and says nothing when the click found none', () => {
        const file = submenuOf(buildAppMenu('Mandor Realtime', 'en', 'win32'), 'File');
        const entry = file.find((each) => each.label === 'Settings…');
        const sent: { channel: string; message: unknown }[] = [];
        const window = {
            isDestroyed: () => false,
            webContents: {
                send: (channel: string, message: unknown) => sent.push({ channel, message }),
            },
        };

        entry?.click?.(undefined, window, undefined);

        expect(sent).toEqual([{ channel: 'menu:settings', message: {} }]);
        expect(() => entry?.click?.(undefined, undefined, undefined)).not.toThrow();
    });

    it('closes with Help, which carries the release notes before and after main speaks', () => {
        for (const platform of ['win32', 'darwin'] as const) {
            const template = buildAppMenu('Mandor Realtime', 'en', platform);

            expect(template.at(-1)?.label).toBe('Help');
            expect(submenuOf(template, 'Help').map((each) => each.label)).toEqual([
                'Release notes',
            ]);
        }

        const spanish = buildAppMenu('Mandor Realtime', 'es', 'win32', {
            state: {
                phase: 'ready',
                support: 'full',
                current: '0.1.0',
                next: { version: '0.2.0' },
            },
            run: () => undefined,
        });

        expect(submenuOf(spanish, 'Ayuda').map((each) => each.label)).toEqual([
            'Reiniciar para actualizar',
            'Notas de la versión',
        ]);
    });
});
