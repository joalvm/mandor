import { byPart } from '@mandor/ui/testing';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ThemePreview } from '../../../src/components/themes/ThemePreview.js';

afterEach(() => {
    cleanup();
});

describe('the miniature of a theme', () => {
    it('is drawn in the theme it shows, so the sheet of that theme paints it', () => {
        render(<ThemePreview theme="dark-contrast" />);

        expect(byPart('theme-preview').dataset['theme']).toBe('dark-contrast');
    });

    it('is a picture, left out of what assistive technology reads', () => {
        render(<ThemePreview theme="light" />);

        expect(byPart('theme-preview')).toHaveAttribute('aria-hidden', 'true');
    });
});
