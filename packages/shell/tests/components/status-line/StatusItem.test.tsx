import { act, cleanup, render, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { StatusItem, useStatusItems } from '../../../src/index.js';

function hang(id: string, order: number): () => void {
    return render(
        <StatusItem id={id} order={order}>
            <i>{id}</i>
        </StatusItem>,
    ).unmount;
}

afterEach(() => {
    cleanup();
});

describe('a piece of the status line declared in the tree', () => {
    it('offers nothing while no piece is mounted', () => {
        const { result } = renderHook(() => useStatusItems());

        expect(result.current).toEqual([]);
    });

    /** The line reads left to right in the order the pieces ask for, not the order they arrived. */
    it('lists the pieces by their order, with what each one draws', () => {
        hang('late', 20);
        hang('early', 10);

        const { result } = renderHook(() => useStatusItems());

        expect(result.current.map((item) => item.id)).toEqual(['early', 'late']);
        expect(result.current[0]?.content).toEqual(<i>early</i>);
    });

    it('redraws a mounted line when a piece mounts and when it leaves', () => {
        const { result } = renderHook(() => useStatusItems());
        let unmount: () => void = () => undefined;

        act(() => {
            unmount = hang('bell', 10);
        });

        expect(result.current.map((item) => item.id)).toEqual(['bell']);

        act(() => {
            unmount();
        });

        expect(result.current).toEqual([]);
    });

    it('moves a piece whose order changes, without a twin', () => {
        const view = render(<StatusItem id="bell" order={10} />);
        const { result } = renderHook(() => useStatusItems());

        view.rerender(<StatusItem id="bell" order={5} />);

        expect(result.current).toHaveLength(1);
        expect(result.current[0]?.order).toBe(5);
    });
});
