import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DocView } from '../src/index.js';

import { AppProviders } from './support/app-providers.js';

describe('DocView', () => {
    /** Embeddable first: no tab around it, no session under it, no grid holding it. */
    it('renders markdown mounted on its own', () => {
        render(<DocView value={'# Notas de la API\n\nEl endpoint responde en JSON.\n'} />, {
            wrapper: AppProviders,
        });

        expect(screen.getByRole('heading', { level: 1, name: 'Notas de la API' })).toBeVisible();
        expect(screen.getByText('El endpoint responde en JSON.')).toBeVisible();
    });

    /**
     * A doc of this app is written by somebody who codes. The colour is read off the class the
     * span carries, which is the whole of what the stylesheet has to go by as well.
     */
    it('colours a fenced block in the language the fence names', () => {
        const fence = ['```ts', 'const port = 8080;', '```'].join('\n');
        const { container } = render(<DocView value={fence} />, { wrapper: AppProviders });

        expect(container.querySelectorAll('code .hljs-keyword')).toHaveLength(1);
        expect(screen.getByText('const')).toBeVisible();
    });

    /** A fence that names nothing is text somebody pasted, and guessing at it colours prose. */
    it('leaves a block that names no language alone', () => {
        const fence = ['```', 'const port = 8080;', '```'].join('\n');
        const { container } = render(<DocView value={fence} />, { wrapper: AppProviders });

        expect(container.querySelectorAll('code span')).toHaveLength(0);
    });

    /** Text in, render out. What it drew before is not state it gets to keep. */
    it('shows the text it is handed and nothing it was handed before', () => {
        const { rerender } = render(<DocView value="Primera versión" />, { wrapper: AppProviders });

        rerender(<DocView value="Segunda versión" />);

        expect(screen.getByText('Segunda versión')).toBeVisible();
        expect(screen.queryByText('Primera versión')).toBeNull();
    });
});
