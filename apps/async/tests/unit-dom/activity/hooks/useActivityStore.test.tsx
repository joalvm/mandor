import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { activityStore } from '../../../../src/renderer/activity/activity-store.js';
import { useActivityStore } from '../../../../src/renderer/activity/hooks/useActivityStore.js';

const ALPHA = 'mandor://demo/payments/connection/alpha';

function count(): number {
    return renderHook(() => useActivityStore((state) => state.entries[ALPHA]?.length ?? 0)).result
        .current;
}

describe('reading the activity of the window', () => {
    afterEach(() => {
        cleanup();
        activityStore.getState().reset();
    });

    it('answers what the selector asks of the store', () => {
        expect(count()).toBe(0);
    });

    it('follows the store when something arrives', () => {
        const { result } = renderHook(() =>
            useActivityStore((state) => state.entries[ALPHA]?.length ?? 0),
        );

        act(() => {
            activityStore.getState().appendActivity(ALPHA, [
                {
                    at: 1,
                    bytes: 4,
                    detail: { at: 1, code: 'unknown' },
                    kind: 'connection-fault',
                },
            ]);
        });

        expect(result.current).toBe(1);
    });
});
