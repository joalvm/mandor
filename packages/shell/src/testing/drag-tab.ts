import { act } from 'react';

/** Where in the group a tab is let go, which is what decides between stacking it and splitting. */
export type DropSide = 'bottom' | 'center' | 'left' | 'right' | 'top';

/** The pixels the group is pretended to have, since nothing is laid out in a test. */
const SIDE = 400;

/** How far into the group is still its edge, kept well inside the fifth the view asks for. */
const EDGE = 20;

/** The frames the view defers its drag work by, flushed inside act so the window never
 * updates outside of it. */
const FRAMES = 3;

const POINTS: Record<DropSide, [number, number]> = {
    bottom: [SIDE / 2, SIDE - EDGE],
    center: [SIDE / 2, SIDE / 2],
    left: [EDGE, SIDE / 2],
    right: [SIDE - EDGE, SIDE / 2],
    top: [SIDE / 2, EDGE],
};

/**
 * Drags a tab onto a group the way a hand does, so a test moves one without knowing how the
 * view listens.
 *
 * The view reads the drag off the document — where the pointer is, and how big the thing under
 * it is — and a test document measures nothing, so the group is told what size to claim for the
 * length of the drag. What travels between the two ends is the view's own, and is never faked.
 * The whole drag runs inside act: the view answers the events with updates of its own, some of
 * them a frame later, and a test that let them land bare would see them fall outside of it.
 */
export async function dragTabOnto(
    tab: Element,
    group: Element,
    side: DropSide = 'center',
): Promise<void> {
    const target = group.querySelector('.dv-content-container');

    if (!(target instanceof HTMLElement)) {
        throw new Error('the group has nothing to drop a tab onto');
    }

    const [clientX, clientY] = POINTS[side];
    const transfer = dataTransfer();

    measured(target);
    await act(async () => {
        tab.dispatchEvent(dragEvent('dragstart', clientX, clientY, transfer));
        target.dispatchEvent(dragEvent('dragenter', clientX, clientY, transfer));
        target.dispatchEvent(dragEvent('dragover', clientX, clientY, transfer));
        target.dispatchEvent(dragEvent('drop', clientX, clientY, transfer));
        tab.dispatchEvent(dragEvent('dragend', clientX, clientY, transfer));
        await frames(FRAMES);
    });
    ghostGone();
}

async function frames(count: number): Promise<void> {
    for (let left = 0; left < count; left += 1) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
    }
}

/** The view hangs a copy of the tab under the pointer and takes it away a frame later, which
 * is a frame no test waits for. */
function ghostGone(): void {
    for (const ghost of document.querySelectorAll('.dv-dragged')) {
        ghost.remove();
    }
}

/** The group claims a size and a place for as long as the drag lasts, and a test throws it away. */
function measured(target: HTMLElement): void {
    Object.defineProperty(target, 'offsetWidth', { value: SIDE, configurable: true });
    Object.defineProperty(target, 'offsetHeight', { value: SIDE, configurable: true });
    target.getBoundingClientRect = () => new DOMRect(0, 0, SIDE, SIDE);
}

function dragEvent(type: string, clientX: number, clientY: number, transfer: unknown): Event {
    const event = new Event(type, { bubbles: true, cancelable: true });

    return Object.assign(event, { clientX, clientY, dataTransfer: transfer });
}

/** What a drag carries between the two ends of it, as much of it as the view reaches for. */
function dataTransfer() {
    const carried = new Map<string, string>();

    return {
        dropEffect: 'move',
        effectAllowed: 'move',
        items: { length: 0 },
        types: [] as string[],
        getData: (key: string) => carried.get(key) ?? '',
        setData: (key: string, value: string) => carried.set(key, value),
        setDragImage: () => undefined,
    };
}
