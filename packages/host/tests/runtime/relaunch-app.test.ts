import { describe, expect, it, vi } from 'vitest';

import { relaunchApp } from '../../src/runtime/relaunch-app.js';
import { trackWrite } from '../../src/runtime/write-drain.js';

const electron = vi.hoisted(() => ({ exit: vi.fn(), relaunch: vi.fn() }));

vi.mock('electron', () => ({ app: electron }));

describe('relaunching the app', () => {
    it('waits for the writes in the air and then starts over', async () => {
        const order: string[] = [];
        let land: () => void = () => undefined;

        electron.relaunch.mockImplementation(() => {
            order.push('relaunch');
        });
        electron.exit.mockImplementation(() => {
            order.push('exit');
        });

        void trackWrite(
            new Promise<void>((resolve) => {
                land = () => {
                    order.push('landed');
                    resolve();
                };
            }),
        );

        const done = relaunchApp();

        expect(order).toEqual([]);

        land();
        await done;

        expect(order).toEqual(['landed', 'relaunch', 'exit']);
    });
});
