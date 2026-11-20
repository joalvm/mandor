import { render } from '@testing-library/react';
import { useRef } from 'react';
import { describe, expect, it } from 'vitest';

import { useToastStack } from '../../../src/components/toast/useToastStack.js';
import { byPart } from '../../../src/testing/by-part.js';

/**
 * Lays a notice out the way a window would, since jsdom lays out nothing: its box, with an edge
 * of a pixel on each side, and the content it holds, which overflows a box clipped shorter.
 */
function standAt(toast: HTMLElement, height: number, box: number): void {
    Object.defineProperties(toast, {
        clientHeight: { configurable: true, value: box - 2 },
        offsetHeight: { configurable: true, value: box },
        scrollHeight: { configurable: true, value: height - 2 },
    });
}

type StackProps = { boxes?: readonly number[]; heights: readonly number[] };

function Stack({ boxes = [], heights }: StackProps) {
    const viewport = useRef<HTMLOListElement>(null);

    useToastStack(viewport, heights.join(' '));

    return (
        <ol
            data-part="toast-viewport"
            ref={(node) => {
                viewport.current = node;
                node?.querySelectorAll<HTMLElement>("[data-part='toast']").forEach((toast, at) => {
                    const height = heights[at] ?? 0;

                    standAt(toast, height, boxes[at] ?? height);
                });
            }}
        >
            <li data-part="toast-overflow">2 más</li>
            {heights.map((height) => (
                <li data-part="toast" data-testid={String(height)} key={height} />
            ))}
        </ol>
    );
}

function property(element: HTMLElement, name: string): string {
    return element.style.getPropertyValue(name);
}

/**
 * The stack is laid out by the window, so what it needs from the notices is written on them:
 * how far each one rides up from the corner when the stack opens, and how tall the front one and
 * the whole stack stand. The newest notice is the last in the list and the front of the stack.
 */
describe('where every notice of the stack stands', () => {
    it('lifts each notice by the heights of the newer ones and their gaps', () => {
        const { getByTestId } = render(<Stack heights={[60, 80, 100]} />);

        expect(property(getByTestId('100'), '--toast-offset')).toBe(
            'calc(0px + 0 * var(--mandor-gap-control))',
        );
        expect(property(getByTestId('80'), '--toast-offset')).toBe(
            'calc(100px + 1 * var(--mandor-gap-control))',
        );
        expect(property(getByTestId('60'), '--toast-offset')).toBe(
            'calc(180px + 2 * var(--mandor-gap-control))',
        );
    });

    it('tells the stack how tall its front notice and the whole list stand', () => {
        render(<Stack heights={[60, 80, 100]} />);

        const viewport = byPart('toast-viewport');

        expect(property(viewport, '--toast-front-height')).toBe('100px');
        expect(property(viewport, '--toast-stack-height')).toBe(
            'calc(240px + 2 * var(--mandor-gap-control))',
        );
    });

    it('measures a notice whole while the stack clips it to the front one', () => {
        // The older notice is clipped to a box of 40, and its content still asks for 60.
        render(<Stack boxes={[40, 100]} heights={[60, 100]} />);

        expect(property(byPart('toast-viewport'), '--toast-stack-height')).toBe(
            'calc(160px + 1 * var(--mandor-gap-control))',
        );
    });

    it('stands an empty stack at no height', () => {
        render(<Stack heights={[]} />);

        expect(property(byPart('toast-viewport'), '--toast-front-height')).toBe('0px');
    });
});
