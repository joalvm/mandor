import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Field, Switch } from '../../../src/index.js';

describe('the Switch primitive', () => {
    it('exposes itself by its label as a switch that is off', () => {
        render(<Switch checked={false} label="Reintentar" onCheckedChange={() => undefined} />);

        const toggle = screen.getByRole('switch', { name: 'Reintentar' });

        expect(toggle).toBeEnabled();
        expect(toggle).toHaveAttribute('aria-checked', 'false');
    });

    it('announces the state it is given and reports the change', () => {
        const onCheckedChange = vi.fn();

        render(<Switch checked label="Reintentar" onCheckedChange={onCheckedChange} />);

        expect(screen.getByRole('switch', { name: 'Reintentar' })).toHaveAttribute(
            'aria-checked',
            'true',
        );

        fireEvent.click(screen.getByRole('switch', { name: 'Reintentar' }));

        expect(onCheckedChange).toHaveBeenCalledWith(false);
    });

    it('takes the id and the message of the field it stands in', () => {
        render(
            <Field id="retry" label="Reintentar" help="Solo cuando el server colgó">
                <Switch checked={false} label="Reintentar" onCheckedChange={() => undefined} />
            </Field>,
        );

        const toggle = screen.getByRole('switch', { name: 'Reintentar' });
        const message = screen.getByText('Solo cuando el server colgó');

        expect(toggle).toHaveAttribute('id', 'retry');
        expect(toggle).toHaveAttribute('aria-describedby', message.id);
    });
});
