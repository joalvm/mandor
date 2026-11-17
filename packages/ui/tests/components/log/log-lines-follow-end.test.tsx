import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LogLines, type LogLine } from '../../../src/components/log/LogLines.js';
import { scaleTokenValues } from '../../../src/styles/token-scale-values.js';

const ROW = Number.parseFloat(scaleTokenValues['mandor-height-row']);

/** What a scroller jsdom never laid out is worth to the window: a screenful of twenty rows. */
const SHOWN = ROW * 20;

/** How tall a drawn line measures: one row of the scale, unless a test wraps them onto two. */
let lineHeight = ROW;

/** The log as tall as the window says the whole of it stands. */
function heightOf(box: Element): number {
    const lines = box.querySelector('[data-part="log-lines-viewport"]');

    return Number.parseFloat(lines?.getAttribute('data-total-size') ?? '0');
}

/**
 * jsdom lays nothing out: the scroll lands where it is asked to, inside the log, and says so
 * after the frame that asked, as a browser does.
 */
function scrollBoxTo(this: Element, options?: ScrollToOptions | number): void {
    const top = typeof options === 'number' ? options : (options?.top ?? 0);

    this.scrollTop = Math.max(0, Math.min(top, heightOf(this) - SHOWN));
    queueMicrotask(() => {
        fireEvent.scroll(this);
    });
}

beforeEach(() => {
    lineHeight = ROW;
    Object.defineProperty(Element.prototype, 'scrollTo', {
        configurable: true,
        value: scrollBoxTo,
    });
    vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockImplementation(function (this: Element) {
        return heightOf(this);
    });
    vi.spyOn(Element.prototype, 'clientHeight', 'get').mockReturnValue(SHOWN);
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
        this: Element,
    ) {
        const height = this.matches('[data-part="log-line"]') ? lineHeight : 0;

        return DOMRect.fromRect({ height, width: 0 });
    });
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    Reflect.deleteProperty(Element.prototype, 'scrollTo');
});

function linesOf(count: number): LogLine[] {
    return Array.from({ length: count }, (_, index) => ({
        key: `log-${String(index)}`,
        tone: 'log',
        text: `line ${String(index)}`,
    }));
}

function log(count: number, followsEnd: boolean) {
    return (
        <LogLines
            empty="Nothing here."
            followsEnd={followsEnd}
            label="Lines"
            lines={linesOf(count)}
        />
    );
}

/** The reader moves the log to `top`, as a wheel or the scrollbar would. */
function readerScrollsTo(top: number): void {
    const box = document.querySelector('[data-part="log-lines"]');

    if (box === null) {
        throw new Error('the log is not drawn');
    }

    box.scrollTop = top;
    fireEvent.scroll(box);
}

describe('a log that keeps to its last line, as a console does (LogLines)', () => {
    it('opens on its last line, with the first ones out of the DOM', async () => {
        render(log(60, true));

        expect(await screen.findByText('line 59')).toBeInTheDocument();
        expect(screen.queryByText('line 0')).toBeNull();
    });

    it('follows the lines that arrive while the reader stays at the end', async () => {
        const { rerender } = render(log(60, true));

        await screen.findByText('line 59');
        rerender(log(61, true));

        expect(await screen.findByText('line 60')).toBeInTheDocument();
    });

    it('stays where the reader scrolled up to when lines arrive', async () => {
        const { rerender } = render(log(60, true));

        await screen.findByText('line 59');
        readerScrollsTo(0);
        rerender(log(61, true));

        expect(await screen.findByText('line 0')).toBeInTheDocument();
        expect(screen.queryByText('line 60')).toBeNull();
    });

    /** Each line is counted one row tall and measured once drawn: a wrapped one grows the log. */
    it('keeps to the last line when the lines it drew stand taller than counted', async () => {
        lineHeight = ROW * 2;

        render(log(60, true));

        expect(await screen.findByText('line 59')).toBeInTheDocument();
    });

    it('reads from the top when it does not follow the end', async () => {
        render(log(60, false));

        expect(await screen.findByText('line 0')).toBeInTheDocument();
        expect(screen.queryByText('line 59')).toBeNull();
    });
});
