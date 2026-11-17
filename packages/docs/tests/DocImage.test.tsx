import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DocImage } from '../src/components/view/DocImage.js';

describe('an image of a doc', () => {
    it('draws the image when it came with the repo', () => {
        render(<DocImage alt="Un diagrama" src="assets/flujo.png" />);

        const image = screen.getByRole('img', { name: 'Un diagrama' });

        expect(image).toHaveAttribute('src', 'assets/flujo.png');
    });

    it('stands in with the text that described it when the filter emptied its source', () => {
        render(<DocImage alt="Un diagrama" src="" />);

        expect(screen.queryByRole('img')).toBeNull();
        expect(screen.getByText('Un diagrama')).toBeVisible();
    });

    it('stands in the same way when it never had a source', () => {
        render(<DocImage alt="Un diagrama" />);

        expect(screen.queryByRole('img')).toBeNull();
        expect(screen.getByText('Un diagrama')).toBeVisible();
    });

    it('draws nothing readable for an image with neither text nor source', () => {
        const { container } = render(<DocImage />);

        expect(container).toHaveTextContent('');
        expect(screen.queryByRole('img')).toBeNull();
    });

    it('keeps an image without a description as a decorative one', () => {
        const { container } = render(<DocImage src="a.png" />);

        expect(container.querySelector('img')).toHaveAttribute('alt', '');
    });
});
