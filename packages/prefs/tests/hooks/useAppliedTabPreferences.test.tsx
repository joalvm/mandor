import { resolvePreferenceValues, type PreferenceValues } from '@mandor/schema';
import { tabPreferences } from '@mandor/shell';
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useAppliedTabPreferences } from '../../src/hooks/useAppliedTabPreferences.js';

function applied(app: PreferenceValues) {
    return renderHook(
        ({ values }) => {
            useAppliedTabPreferences(values);
        },
        { initialProps: { values: resolvePreferenceValues({ app }) } },
    );
}

afterEach(() => {
    cleanup();
});

describe('the tabs of the window, as the settings say', () => {
    it('asks before closing unsaved work, takes looks and reopens twenty, until told otherwise', () => {
        applied({});

        expect(tabPreferences.getState()).toEqual({
            alwaysNew: false,
            askUnsaved: true,
            closedKept: 20,
        });
    });

    it('hands the tabs what the person set, and the defaults back when the window goes', () => {
        const { unmount } = applied({
            'tabs.alwaysNew': 'on',
            'tabs.askUnsaved': 'off',
            'tabs.closedKept': '50',
        });

        expect(tabPreferences.getState()).toEqual({
            alwaysNew: true,
            askUnsaved: false,
            closedKept: 50,
        });

        unmount();

        expect(tabPreferences.getState()).toEqual(tabPreferences.getInitialState());
    });

    it('follows a change of the settings while the window is open', () => {
        const { rerender } = applied({});

        rerender({ values: resolvePreferenceValues({ app: { 'tabs.closedKept': '100' } }) });

        expect(tabPreferences.getState().closedKept).toBe(100);
    });
});
