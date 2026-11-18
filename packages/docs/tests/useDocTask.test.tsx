import { renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { DocTaskContext, useDocTask } from '../src/hooks/useDocTask.js';

describe('what a task of the page does when pressed', () => {
    it('is nothing where nothing around the page writes the doc', () => {
        const { result } = renderHook(() => useDocTask());

        expect(result.current).toBeNull();
    });

    it('is what the page around the task was handed', () => {
        const onTask = vi.fn();
        const wrapper = ({ children }: PropsWithChildren) => (
            <DocTaskContext.Provider value={onTask}>{children}</DocTaskContext.Provider>
        );
        const { result } = renderHook(() => useDocTask(), { wrapper });

        result.current?.(2);

        expect(onTask).toHaveBeenCalledWith(2);
    });
});
