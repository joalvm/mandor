import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useRef, type ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { useTextZoomInput } from '../../src/hooks/useTextZoomInput.js';
import { setTextZoom, textZoom } from '../../src/lib/text-zoom.js';

function Page(): ReactNode {
    const ref = useRef<HTMLElement>(null);

    useTextZoomInput(ref);

    return (
        <article ref={ref}>
            <p>Texto</p>
        </article>
    );
}

afterEach(() => {
    cleanup();
    setTextZoom(0);
});

describe('useTextZoomInput', () => {
    it('lets the reader resize the text from over the element the ref points at', () => {
        render(<Page />);

        fireEvent.wheel(screen.getByText('Texto'), { ctrlKey: true, deltaY: -100 });

        expect(textZoom()).toBe(1);
    });

    it('stops listening once the element is gone', () => {
        const { unmount } = render(<Page />);
        const text = screen.getByText('Texto');

        unmount();
        fireEvent.wheel(text, { ctrlKey: true, deltaY: -100 });

        expect(textZoom()).toBe(0);
    });
});
