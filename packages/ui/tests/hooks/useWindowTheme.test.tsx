import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { useWindowTheme } from '../../src/hooks/useWindowTheme.js';

function Harness(): ReactNode {
    return <p>{useWindowTheme()}</p>;
}

afterEach(() => {
    // The window goes first: a theme put back under a mounted tree is an update outside act.
    cleanup();
    document.documentElement.removeAttribute('data-theme');
});

describe('useWindowTheme', () => {
    it('draws again with the theme the window switches to', async () => {
        document.documentElement.dataset['theme'] = 'light';
        render(<Harness />);

        expect(screen.getByText('light')).toBeInTheDocument();

        // The window tells of the switch on a turn of its own, so the new theme is waited for.
        document.documentElement.dataset['theme'] = 'dark';

        expect(await screen.findByText('dark')).toBeInTheDocument();
    });
});
