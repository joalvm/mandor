import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Disclosure } from '../../../src/index.js';

describe('the Disclosure block', () => {
    it('starts folded and unfolds what it holds from its button', () => {
        render(
            <Disclosure label="Advanced">
                <p>Prefix</p>
            </Disclosure>,
        );

        const button = screen.getByRole('button', { name: 'Advanced' });

        expect(button).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByText('Prefix')).toBeNull();

        fireEvent.click(button);

        expect(button).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByText('Prefix')).toBeVisible();
    });

    it('starts open when the owner says something inside is already in use', () => {
        render(
            <Disclosure defaultOpen label="Advanced">
                <p>Prefix</p>
            </Disclosure>,
        );

        expect(screen.getByRole('button', { name: 'Advanced' })).toHaveAttribute(
            'aria-expanded',
            'true',
        );
        expect(screen.getByText('Prefix')).toBeVisible();
    });
});
