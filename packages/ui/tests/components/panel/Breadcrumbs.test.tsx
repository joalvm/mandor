import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Breadcrumbs } from '../../../src/components/panel/Breadcrumbs.js';

describe('breadcrumbs', () => {
    it('names the trail so a reader with a screen finds it', () => {
        render(<Breadcrumbs label="Ubicación" parts={['pagos', 'gateway']} />);

        expect(screen.getByRole('region', { name: 'Ubicación' })).toHaveAttribute(
            'data-part',
            'breadcrumbs',
        );
    });

    it('reads the parts in order, with chevrons between them the reader skips', () => {
        render(<Breadcrumbs label="Ubicación" parts={['pagos', 'puertas', 'gateway']} />);

        const nav = screen.getByRole('region', { name: 'Ubicación' });
        const separators = nav.querySelectorAll('[data-part="breadcrumbs-separator"]');

        expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
            'pagos',
            'puertas',
            'gateway',
        ]);
        expect(separators).toHaveLength(2);

        for (const separator of separators) {
            expect(separator.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
        }
    });

    it('names the last stretch as the current page, and only that one', () => {
        render(<Breadcrumbs label="Ubicación" parts={['pagos', 'gateway']} />);

        expect(screen.getByText('gateway')).toHaveAttribute('aria-current', 'page');
        expect(screen.getByText('pagos')).not.toHaveAttribute('aria-current');
    });

    it('draws the mark of what the trail ends in ahead of it, outside the list', () => {
        render(
            <Breadcrumbs label="Ubicación" parts={['pagos', 'gateway']}>
                <b>HTTP</b>
            </Breadcrumbs>,
        );

        const lead = screen.getByText('HTTP').parentElement;

        expect(lead).toHaveAttribute('data-part', 'breadcrumbs-lead');
        expect(screen.getByRole('list')).not.toContainElement(lead);
    });

    /** jsdom lays nothing out, so truncation is asserted on the class that does it. */
    it('truncates each stretch so a long trail never pushes the window out', () => {
        render(
            <Breadcrumbs
                label="Ubicación"
                parts={['pagos', 'puertas-de-muy-largo-recorrido-que-no-caben', 'gateway']}
            />,
        );

        const nav = screen.getByRole('region', { name: 'Ubicación' });
        const stretches = nav.querySelectorAll('span.truncate');

        expect(stretches).toHaveLength(3);
    });
});
