import { beforeEach, describe, expect, it, vi } from 'vitest';

import { failToStart } from '../../src/runtime/fail-to-start.js';

const electron = vi.hoisted(() => ({
    app: { exit: vi.fn() },
    dialog: { showErrorBox: vi.fn() },
}));

vi.mock('electron', () => electron);

beforeEach(() => {
    vi.clearAllMocks();
});

describe('an app that cannot come up', () => {
    /** No window opened: without this the process stays, holding the lock of the single instance. */
    it('says why with the dialog of the system, and only then ends the process', () => {
        const order: string[] = [];

        electron.dialog.showErrorBox.mockImplementation(() => order.push('dialog'));
        electron.app.exit.mockImplementation(() => order.push('exit'));

        failToStart(new Error('EACCES: permission denied'));

        expect(electron.dialog.showErrorBox).toHaveBeenCalledWith(
            'The app could not start',
            'What stopped it: EACCES: permission denied',
        );
        expect(electron.app.exit).toHaveBeenCalledWith(1);
        expect(order).toEqual(['dialog', 'exit']);
    });

    it('says what was thrown when it is not an error', () => {
        failToStart('the disk is gone');

        expect(electron.dialog.showErrorBox).toHaveBeenCalledWith(
            'The app could not start',
            'What stopped it: the disk is gone',
        );
    });
});
