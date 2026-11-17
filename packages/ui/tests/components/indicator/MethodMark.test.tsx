import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MethodMark } from '../../../src/index.js';

describe('the verb of a request (MethodMark)', () => {
    it('wears the hue of its verb, whatever case it was written in', () => {
        render(<MethodMark method="post" />);

        const mark = screen.getByText('POST');

        expect(mark).toHaveAttribute('data-method', 'POST');
        expect(mark).toHaveClass('text-text-method-post');
    });

    it('reads a verb the list does not know as plain text', () => {
        render(<MethodMark method="PURGE" />);

        expect(screen.getByText('PURGE')).toHaveClass('text-text-secondary');
    });

    it('cuts the long verbs in the compact slot, and keeps the hue', () => {
        render(
            <>
                <MethodMark compact method="DELETE" />
                <MethodMark compact method="OPTIONS" />
                <MethodMark compact method="GET" />
            </>,
        );

        expect(screen.getByText('DEL')).toHaveClass('text-text-method-delete', 'text-2xs');
        expect(screen.getByText('OPT')).toHaveClass('text-text-method-options');
        expect(screen.getByText('GET')).toHaveClass('text-text-method-get');
    });
});
