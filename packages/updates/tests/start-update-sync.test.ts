import { success } from '@mandor/ipc';
import type { FakeBridge } from '@mandor/ipc/testing';
import { bridge } from '@mandor/shell';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { startUpdateSync } from '../src/start-update-sync.js';
import { updateStore } from '../src/update-store.js';

import { stateWith } from './support/update-states.js';

const fake = bridge as FakeBridge;

let stop: () => void;

beforeEach(() => {
    vi.restoreAllMocks();
    updateStore.getState().reset();
});

afterEach(() => {
    stop();
});

describe('the window following what main says about the updates', () => {
    it('asks for the state once and keeps the answer', async () => {
        const asked = stateWith({ phase: 'available', next: { version: '0.2.0' } });

        vi.spyOn(bridge.update, 'state').mockResolvedValue(success(asked));
        stop = startUpdateSync();

        await vi.waitFor(() => {
            expect(updateStore.getState().state).toEqual(asked);
        });
    });

    it('takes every push of main as the whole new state', () => {
        stop = startUpdateSync();
        fake.emitUpdate(stateWith({ phase: 'downloading', progress: 40 }));

        expect(updateStore.getState().state?.progress).toBe(40);
    });

    it('does not let a late answer cover a push that already arrived', async () => {
        let answer: (state: ReturnType<typeof stateWith>) => void = () => undefined;

        vi.spyOn(bridge.update, 'state').mockReturnValue(
            new Promise((resolve) => {
                answer = (state) => {
                    resolve(success(state));
                };
            }),
        );
        stop = startUpdateSync();
        fake.emitUpdate(stateWith({ phase: 'ready', next: { version: '0.2.0' } }));
        answer(stateWith({ phase: 'checking' }));
        await new Promise((done) => setTimeout(done, 0));

        expect(updateStore.getState().state?.phase).toBe('ready');
    });

    it('stops listening when it is given back', () => {
        stop = startUpdateSync();
        stop();
        fake.emitUpdate(stateWith({ phase: 'checking' }));

        expect(updateStore.getState().state).toBeUndefined();
    });
});
