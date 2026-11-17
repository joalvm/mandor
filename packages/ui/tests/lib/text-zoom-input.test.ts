import { fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { setTextZoom, textZoom } from '../../src/lib/text-zoom.js';
import { listenForTextZoom } from '../../src/lib/text-zoom-input.js';

const stops: (() => void)[] = [];

/** An element that lets the reader resize the text, and a child to turn the wheel over. */
function listening(): HTMLElement {
    const element = document.body.appendChild(document.createElement('div'));
    const child = element.appendChild(document.createElement('p'));

    stops.push(listenForTextZoom(element));

    return child;
}

afterEach(() => {
    stops.splice(0).forEach((stop) => {
        stop();
    });
    document.body.replaceChildren();
    setTextZoom(0);
});

describe('resizing the text from the wheel and the keys (text-zoom-input)', () => {
    /** Away from the reader is larger, the way every browser zooms a page. */
    it('enlarges the text a step for each notch away from the reader with the zoom key held', () => {
        const over = listening();

        fireEvent.wheel(over, { ctrlKey: true, deltaY: -100 });
        fireEvent.wheel(over, { ctrlKey: true, deltaY: -100 });

        expect(textZoom()).toBe(2);

        fireEvent.wheel(over, { ctrlKey: true, deltaY: 100 });

        expect(textZoom()).toBe(1);
    });

    it('takes the command key of a Mac for the zoom key', () => {
        fireEvent.wheel(listening(), { deltaY: -100, metaKey: true });

        expect(textZoom()).toBe(1);
    });

    /** The editor under the pointer does not scroll, and the window does not zoom its interface. */
    it('keeps the wheel it resizes with from scrolling anything or zooming the window', () => {
        const over = listening();

        expect(fireEvent.wheel(over, { ctrlKey: true, deltaY: -100 })).toBe(false);
    });

    it('leaves a wheel without the zoom key, or with another key held too, to scroll', () => {
        const over = listening();

        expect(fireEvent.wheel(over, { deltaY: -100 })).toBe(true);
        expect(fireEvent.wheel(over, { ctrlKey: true, deltaY: -100, shiftKey: true })).toBe(true);
        expect(textZoom()).toBe(0);
    });

    /** The zero is read by where it sits: on some layouts it is typed with a shift. */
    it('brings the text back to the size of the app with the zoom key and the zero', () => {
        const over = listening();

        setTextZoom(4);

        expect(fireEvent.keyDown(over, { code: 'Digit0', ctrlKey: true, key: 'à' })).toBe(false);
        expect(textZoom()).toBe(0);
    });

    /** The zero typed into another field of the window is the window's to handle. */
    it('leaves the zero pressed away from the element, with the pointer elsewhere, to the window', () => {
        listening();
        setTextZoom(4);

        expect(fireEvent.keyDown(document.body, { code: 'Digit0', ctrlKey: true, key: '0' })).toBe(
            true,
        );
        expect(textZoom()).toBe(4);
    });

    it('lets every other key through', () => {
        const over = listening();

        setTextZoom(4);

        expect(fireEvent.keyDown(over, { code: 'Digit0', key: '0' })).toBe(true);
        expect(fireEvent.keyDown(over, { code: 'KeyA', ctrlKey: true, key: 'a' })).toBe(true);
        expect(textZoom()).toBe(4);
    });

    it('hears nothing once it stops listening', () => {
        const over = listening();

        stops.splice(0).forEach((stop) => {
            stop();
        });
        fireEvent.wheel(over, { ctrlKey: true, deltaY: -100 });

        expect(textZoom()).toBe(0);

        setTextZoom(4);
        fireEvent.keyDown(over, { code: 'Digit0', ctrlKey: true, key: '0' });

        expect(textZoom()).toBe(4);
    });
});
