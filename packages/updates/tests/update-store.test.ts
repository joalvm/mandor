import { beforeEach, describe, expect, it } from 'vitest';

import { updateStore } from '../src/update-store.js';

import { stateWith } from './support/update-states.js';

beforeEach(() => {
    updateStore.getState().reset();
});

describe('the store of the updates', () => {
    it('starts knowing nothing, so the window draws nothing until main has spoken', () => {
        expect(updateStore.getState().state).toBeUndefined();
    });

    it('keeps the whole of what main last said', () => {
        const ready = stateWith({ phase: 'ready', next: { version: '0.2.0' } });

        updateStore.getState().setState(ready);

        expect(updateStore.getState().state).toEqual(ready);
    });

    it('lets a version be announced once, and says so to the one who asks first', () => {
        const { announce } = updateStore.getState();

        expect(announce('0.2.0')).toBe(true);
        expect(announce('0.2.0')).toBe(false);
        expect(announce('0.3.0')).toBe(true);
    });

    it('forgets what it knew and what it announced when it is reset', () => {
        updateStore.getState().setState(stateWith({ phase: 'checking' }));
        updateStore.getState().announce('0.2.0');
        updateStore.getState().reset();

        expect(updateStore.getState().state).toBeUndefined();
        expect(updateStore.getState().announce('0.2.0')).toBe(true);
    });
});
