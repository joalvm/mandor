import type { FakeBridge } from '@mandor/ipc/testing';
import { success } from '@mandor/ipc';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { shellStore } from '../../src/index.js';
import { useWindowReady } from '../../src/hooks/useWindowReady.js';

type Mandor = { mandor: FakeBridge };

let told: number;
let frames: (() => void)[];

function Harness() {
    useWindowReady();

    return <span />;
}

/** Runs the frames that were asked for, one batch at a time, the way the display would. */
function nextFrame(): void {
    for (const frame of frames.splice(0)) {
        frame();
    }
}

beforeEach(() => {
    told = 0;
    frames = [];
    vi.stubGlobal('requestAnimationFrame', (callback: () => void) => frames.push(callback));
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
    (window as unknown as Mandor).mandor.window.ready = () => {
        told += 1;

        return Promise.resolve(success({}));
    };
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe('useWindowReady', () => {
    it('says nothing while no origin is adopted', () => {
        render(<Harness />);
        nextFrame();
        nextFrame();

        expect(told).toBe(0);
    });

    it('says it once, two frames after the origin is adopted', () => {
        render(<Harness />);
        act(() => {
            shellStore.setState({ activeOriginId: 'local' });
        });

        nextFrame();

        expect(told).toBe(0);

        nextFrame();
        nextFrame();

        expect(told).toBe(1);
    });

    it('does not say it again when the origin changes to another', () => {
        render(<Harness />);
        act(() => {
            shellStore.setState({ activeOriginId: 'local' });
        });
        nextFrame();
        nextFrame();
        act(() => {
            shellStore.setState({ activeOriginId: 'work' });
        });
        nextFrame();
        nextFrame();

        expect(told).toBe(1);
    });
});
