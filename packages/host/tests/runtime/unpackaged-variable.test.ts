import { afterEach, describe, expect, it, vi } from 'vitest';

import { unpackagedVariable } from '../../src/runtime/unpackaged-variable.js';

const electron = vi.hoisted(() => ({ app: { isPackaged: false } }));

vi.mock('electron', () => electron);

const NAME = 'MANDOR_TEST_UNPACKAGED';

afterEach(() => {
    vi.unstubAllEnvs();
    electron.app.isPackaged = false;
});

describe('a variable only a run from the source may set', () => {
    it('is read while the app runs from the source', () => {
        vi.stubEnv(NAME, 'http://localhost:5173');

        expect(unpackagedVariable(NAME)).toBe('http://localhost:5173');
    });

    /** Whoever sets it outside the app would point the window, bridge and all, at a page of theirs. */
    it('is never read by an installed app', () => {
        vi.stubEnv(NAME, 'https://elsewhere.example');
        electron.app.isPackaged = true;

        expect(unpackagedVariable(NAME)).toBeUndefined();
    });
});
