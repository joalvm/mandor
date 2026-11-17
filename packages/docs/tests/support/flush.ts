import { act } from '@testing-library/react';

/**
 * Bridge answers land in the store one microtask after whatever asked for them. Flushing through
 * act keeps the assertion after the update, with no arbitrary timer.
 */
export async function flush(): Promise<void> {
    await act(async () => {
        await Promise.resolve();
    });
}
