import { act, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SplitHalf } from '../../../src/components/split/SplitHalf.js';
import { SplitPane } from '../../../src/components/split/SplitPane.js';
import { useFitDirection } from '../../../src/components/split/useFitDirection.js';
import { Tabs, TabsList, TabsPanel, TabsStrip, TabsTab } from '../../../src/index.js';

type Heard = (entries: { contentRect: { width: number } }[]) => void;

const observers: { disconnected: boolean; heard: Heard; observed: Element[] }[] = [];

/** A box the test resizes by hand: jsdom lays nothing out, so nothing would ever be measured. */
class HandResizedObserver {
    private readonly entry: (typeof observers)[number];

    constructor(heard: Heard) {
        this.entry = { disconnected: false, heard, observed: [] };
        observers.push(this.entry);
    }

    observe(element: Element): void {
        this.entry.observed.push(element);
    }

    disconnect(): void {
        this.entry.disconnected = true;
    }
}

function resize(width: number): void {
    act(() => {
        observers.at(-1)?.heard([{ contentRect: { width } }]);
    });
}

beforeEach(() => {
    observers.length = 0;
    vi.stubGlobal('ResizeObserver', HandResizedObserver);
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('how the halves of a split stand', () => {
    /** The first frame is not the moment to flip the pane: until measured, the box is wide. */
    it('stands a fitting pane side by side until it has been measured', () => {
        const box = { current: document.createElement('div') };
        const { result } = renderHook(() => useFitDirection(box, 'fit'));

        expect(result.current).toBe('row');
        expect(observers[0]?.observed).toEqual([box.current]);
    });

    it('follows the box as it is dragged narrower and wider', () => {
        const box = { current: document.createElement('div') };
        const { result } = renderHook(() => useFitDirection(box, 'fit'));

        resize(639);

        expect(result.current).toBe('column');

        resize(640);

        expect(result.current).toBe('row');
    });

    it('keeps the halves side by side down to the room the pane asks for', () => {
        const box = { current: document.createElement('div') };
        const { result } = renderHook(() => useFitDirection(box, 'fit', 400));

        resize(399);

        expect(result.current).toBe('column');

        resize(400);

        expect(result.current).toBe('row');
    });

    it('measures nothing for a pane that always stands one way', () => {
        const box = { current: document.createElement('div') };
        const { result } = renderHook(() => useFitDirection(box, 'column'));

        expect(result.current).toBe('column');
        expect(observers).toHaveLength(0);
    });

    it('stops measuring once the box is gone', () => {
        const box = { current: document.createElement('div') };
        const { unmount } = renderHook(() => useFitDirection(box, 'fit'));

        unmount();

        expect(observers[0]?.disconnected).toBe(true);
    });

    it('measures nothing while there is no box', () => {
        const { result } = renderHook(() => useFitDirection({ current: null }, 'fit'));

        expect(result.current).toBe('row');
        expect(observers).toHaveLength(0);
    });

    /** A group among four, or a panel dragged narrow, puts the second half under the first. */
    it('turns the line across once the pane is too narrow for two halves', () => {
        render(
            <SplitPane direction="fit" label="Split" onValueChange={vi.fn()} value={50}>
                <SplitHalf>first</SplitHalf>
                <SplitHalf>second</SplitHalf>
            </SplitPane>,
        );

        const line = screen.getByRole('separator', { name: 'Split' });

        expect(line).toHaveAttribute('aria-orientation', 'vertical');

        resize(320);

        expect(line).toHaveAttribute('aria-orientation', 'horizontal');
    });

    /** The moments of a script stand in a column only while the script beside them reads. */
    it('puts a column of sections over its panels once the room is too narrow for both', () => {
        render(
            <Tabs onValueChange={vi.fn()} orientation="fit" value="before">
                <TabsStrip>
                    <TabsList label="Moments">
                        <TabsTab label="Before" value="before" />
                        <TabsTab label="After" value="after" />
                    </TabsList>
                </TabsStrip>
                <TabsPanel value="before">before</TabsPanel>
                <TabsPanel value="after">after</TabsPanel>
            </Tabs>,
        );

        const column = screen.getByRole('tablist', { name: 'Moments' });

        expect(column).toHaveAttribute('aria-orientation', 'vertical');
        expect(column.closest('[data-part="tabs-strip"]')).toBeNull();

        resize(399);

        const strip = screen.getByRole('tablist', { name: 'Moments' });

        expect(strip).toHaveAttribute('aria-orientation', 'horizontal');
        expect(strip.closest('[data-part="tabs-strip"]')).not.toBeNull();
    });
});
