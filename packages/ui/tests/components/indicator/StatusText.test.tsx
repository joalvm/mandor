import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StatusText } from '../../../src/index.js';

describe('the words of a bar (StatusText)', () => {
    it('is read aloud when it changes, as a status and not as an alert', () => {
        render(<StatusText className="ml-auto">Sincronizando…</StatusText>);

        const status = screen.getByRole('status');

        expect(status).toHaveTextContent('Sincronizando…');
        expect(status).toHaveAttribute('data-part', 'status-text');
        expect(status).toHaveClass('ml-auto');
        expect(screen.queryByRole('alert')).toBeNull();
    });
});
