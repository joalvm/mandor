import { act, cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { useTextZoom } from '../../src/hooks/useTextZoom.js';
import { setTextZoom } from '../../src/lib/text-zoom.js';

function Harness(): ReactNode {
    return <p>{`step ${String(useTextZoom())}`}</p>;
}

afterEach(() => {
    // The window goes first: a step put back under a mounted tree is an update outside act.
    cleanup();
    setTextZoom(0);
});

describe('useTextZoom', () => {
    it('draws again at each step the reader moves the text to', () => {
        render(<Harness />);

        expect(screen.getByText('step 0')).toBeInTheDocument();

        act(() => {
            setTextZoom(3);
        });

        expect(screen.getByText('step 3')).toBeInTheDocument();
    });
});
