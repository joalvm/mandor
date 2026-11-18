import { afterEach, describe, expect, it, vi } from 'vitest';

import { saveStandIn } from '../../src/export/save-stand-in.js';

const electron = vi.hoisted(() => ({ app: { isPackaged: false } }));

vi.mock('electron', () => electron);

afterEach(() => {
    vi.unstubAllEnvs();
    electron.app.isPackaged = false;
});

describe('the folder a save answers with when nobody is there to pick one', () => {
    it('is the one the run that stands in for the user names', () => {
        vi.stubEnv('MANDOR_SAVE_DIR', '/tmp/run/exports');

        expect(saveStandIn()).toBe('/tmp/run/exports');
    });

    /** A shell that exports the name with no value has not named a folder. */
    it('is none while the run names nothing', () => {
        vi.stubEnv('MANDOR_SAVE_DIR', '');

        expect(saveStandIn()).toBeNull();
    });

    /** Whoever sets it outside the app would land every export where the user did not pick. */
    it('is none in an installed app, whatever the environment says', () => {
        vi.stubEnv('MANDOR_SAVE_DIR', '/tmp/run/exports');
        electron.app.isPackaged = true;

        expect(saveStandIn()).toBeNull();
    });
});
