import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { usePreferenceValue } from '../../src/hooks/usePreferenceValue.js';
import { PreferencesProvider, usePreferences } from '../../src/preferences-context.js';

function read() {
    return renderHook(
        () => ({ preferences: usePreferences(), value: usePreferenceValue('activity.maxEntries') }),
        { wrapper: PreferencesProvider },
    );
}

afterEach(() => {
    cleanup();
    window.localStorage.clear();
});

describe('one preference, read by its key', () => {
    it('is the default until the person sets it, and what they set after', () => {
        const { result } = read();

        expect(result.current.value).toBe('500');

        act(() => {
            result.current.preferences.writePreference('activity.maxEntries', '2000');
        });

        expect(result.current.value).toBe('2000');
    });
});
