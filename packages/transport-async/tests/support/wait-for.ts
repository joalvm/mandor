import { vi } from 'vitest';

/** Waits on a condition of the sockets, never on the clock: a slow machine only waits longer. */
export async function waitFor(condition: () => void): Promise<void> {
    await vi.waitFor(condition, { interval: 10, timeout: 5_000 });
}
