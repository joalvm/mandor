import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { TextDirection } from '../../src/components/layout/TextDirection.js';
import { useWritingDirection } from '../../src/hooks/useWritingDirection.js';

function Harness(): ReactNode {
    return <p>{`runs ${useWritingDirection()}`}</p>;
}

afterEach(() => {
    cleanup();
});

describe('useWritingDirection', () => {
    it('reads the way the nearest window says its text runs', () => {
        render(
            <TextDirection dir="rtl">
                <Harness />
            </TextDirection>,
        );

        expect(screen.getByText('runs rtl')).toBeInTheDocument();
    });

    it('runs from the left where nothing says otherwise', () => {
        render(<Harness />);

        expect(screen.getByText('runs ltr')).toBeInTheDocument();
    });
});
