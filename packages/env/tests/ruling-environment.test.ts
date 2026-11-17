import { describe, expect, it } from 'vitest';

import { rulingEnvironmentId } from '../src/lib/ruling-environment.js';

const STATE = {
    activeEnvironmentIds: { events: 'dev' },
    defaultEnvironmentIds: { events: 'prod' },
};

describe('the environment that rules what a folder sends', () => {
    it('is the one the app chose, over the one of the window', () => {
        expect(rulingEnvironmentId(STATE, 'events', 'stage')).toBe('stage');
    });

    it('is the default of the workspace when the app chose none', () => {
        expect(rulingEnvironmentId(STATE, 'events', null)).toBe('prod');
    });

    it('is the one of the window when the app makes no choice of its own', () => {
        expect(rulingEnvironmentId(STATE, 'events', undefined)).toBe('dev');
        expect(
            rulingEnvironmentId({ ...STATE, activeEnvironmentIds: {} }, 'events', undefined),
        ).toBe('prod');
    });

    it('is none for a workspace with neither a choice nor a default', () => {
        expect(rulingEnvironmentId(STATE, 'otro', undefined)).toBeNull();
    });
});
