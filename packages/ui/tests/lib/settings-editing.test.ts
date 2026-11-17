import { describe, expect, it, vi } from 'vitest';

import {
    defaultsEditing,
    overridesEditing,
    settingsOver,
    withoutSetting,
} from '../../src/lib/settings-editing.js';

type Values = { attempts: number; enabled: boolean };

const DEFAULTS: Values = { attempts: 5, enabled: true };

const WORDS = {
    caption: 'Default from',
    onFollow: () => undefined,
    place: 'Settings',
    resetLabel: 'Use the default',
};

describe('a group of settings over its defaults', () => {
    it('reads each setting from what was kept over it, or from the default', () => {
        expect(settingsOver({ attempts: 2 }, DEFAULTS)).toEqual({ attempts: 2, enabled: true });
        expect(settingsOver(undefined, DEFAULTS)).toEqual(DEFAULTS);
    });

    /** What was kept comes from disk, written by another version: only the settings of the group count. */
    it('reads a setting kept empty as the default, and drops one the group does not have', () => {
        const kept = { attempts: undefined, retired: 3 };

        expect(settingsOver<Values>(kept, DEFAULTS)).toEqual(DEFAULTS);
    });

    it('forgets one setting, and with it whatever was kept empty', () => {
        expect(withoutSetting<Values>({ attempts: 2, enabled: undefined }, 'attempts')).toEqual({});
    });

    it('keeps a change as the holder own, and only that change', () => {
        const onOverrides = vi.fn();
        const editing = overridesEditing({
            defaults: DEFAULTS,
            onOverrides,
            overrides: { enabled: false },
            words: WORDS,
        });

        editing.change({ attempts: 3 });

        expect(editing.values).toEqual({ attempts: 5, enabled: false });
        expect(onOverrides).toHaveBeenCalledWith({ attempts: 3, enabled: false });
    });

    it('names the defaults on a row it follows, and the way back on a row it keeps', () => {
        const onOverrides = vi.fn();
        const editing = overridesEditing({
            defaults: DEFAULTS,
            onOverrides,
            overrides: { enabled: false },
            words: WORDS,
        });

        expect(editing.inheritanceOf('attempts')).toEqual({
            caption: 'Default from',
            onFollow: WORDS.onFollow,
            place: 'Settings',
            reset: undefined,
        });

        editing.inheritanceOf('enabled')?.reset?.onReset();

        expect(onOverrides).toHaveBeenCalledWith({});
    });

    it('edits the defaults themselves with nothing above them', () => {
        const onDefaults = vi.fn();
        const editing = defaultsEditing(DEFAULTS, onDefaults);

        editing.change({ enabled: false });

        expect(onDefaults).toHaveBeenCalledWith({ attempts: 5, enabled: false });
        expect(editing.inheritanceOf('enabled')).toBeUndefined();
        expect(editing.values).toBe(DEFAULTS);
    });
});
